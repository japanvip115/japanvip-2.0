import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { sendNewsletterEmail } from '@/lib/email.service'
import { ensureUnsubscribeToken, buildUnsubscribeUrl } from '@/lib/marketing.service'

export const maxDuration = 60

const BATCH = 150

const schema = z.object({
  subject: z.string().min(3).max(200),
  bodyHtml: z.string().min(3).max(200000),
  campaignId: z.string().max(64).optional(),
  raw: z.boolean().optional(),
  // 'users' | 'subscribers' | 'all' (default: all)
  audience: z.enum(['users', 'subscribers', 'all']).optional(),
})

type Recipient = { id: string | null; email: string; fullName: string | null; type: 'user' | 'subscriber' }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { subject, bodyHtml, campaignId: cid, raw, audience = 'all' } = schema.parse(await req.json())
    const campaignId = cid || `nl_${randomBytes(8).toString('hex')}`

    const recipients: Recipient[] = []

    // Lấy từ bảng users (khách đăng ký web)
    if (audience === 'users' || audience === 'all') {
      const users = await prisma.$queryRaw<{ id: string; email: string; fullName: string | null }[]>`
        SELECT u.id, u.email, p.full_name AS "fullName"
        FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.marketing_opt_in = true AND u.email_verified = true AND u.role = 'CUSTOMER'
          AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el WHERE el.email = u.email AND el.type = 'newsletter' AND el.meta->>'campaignId' = ${campaignId}
          )
        ORDER BY u.created_at ASC
        LIMIT ${BATCH}
      `
      recipients.push(...users.map(u => ({ ...u, type: 'user' as const })))
    }

    // Lấy từ bảng subscribers (danh sách import / GetResponse)
    if ((audience === 'subscribers' || audience === 'all') && recipients.length < BATCH) {
      const subs = await prisma.$queryRaw<{ id: number; email: string; name: string | null }[]>`
        SELECT s.id, s.email, s.name
        FROM subscribers s
        WHERE s.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el WHERE el.email = s.email AND el.type = 'newsletter' AND el.meta->>'campaignId' = ${campaignId}
          )
        ORDER BY s.created_at ASC
        LIMIT ${BATCH - recipients.length}
      `
      recipients.push(...subs.map(s => ({ id: null, email: s.email, fullName: s.name, type: 'subscriber' as const })))
    }

    // Dedup by email (case where user & subscriber share same email)
    const seen = new Set<string>()
    const unique = recipients.filter(r => {
      const key = r.email.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    let sent = 0
    for (const u of unique) {
      try {
        let unsubscribeUrl = ''
        if (u.type === 'user' && u.id) {
          const token = await ensureUnsubscribeToken(u.id)
          unsubscribeUrl = buildUnsubscribeUrl(token)
        } else {
          // subscriber: tạo/dùng unsubscribeToken trong bảng subscribers
          const sub = await prisma.subscriber.findUnique({ where: { email: u.email }, select: { id: true, unsubscribeToken: true } })
          if (sub) {
            let token = sub.unsubscribeToken
            if (!token) {
              token = randomBytes(16).toString('hex')
              await prisma.subscriber.update({ where: { id: sub.id }, data: { unsubscribeToken: token } })
            }
            unsubscribeUrl = buildUnsubscribeUrl(token)
          }
        }
        await sendNewsletterEmail({ email: u.email, fullName: u.fullName || 'bạn', subject, bodyHtml, unsubscribeUrl, raw })
        await prisma.emailLog.create({ data: { email: u.email, type: 'newsletter', userId: u.id ?? undefined, meta: { campaignId } } })
        sent++
      } catch (err) {
        console.error('newsletter send failed for', u.email, err)
      }
    }

    return apiSuccess({ campaignId, sent, hasMore: unique.length === BATCH }, `Đã gửi ${sent} email`)
  } catch (err) {
    return handleApiError(err)
  }
}

// Đếm số người sẽ nhận (preview trước khi gửi)
export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  const [userRows, subRows] = await Promise.all([
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM users
      WHERE marketing_opt_in = true AND email_verified = true AND role = 'CUSTOMER' AND status = 'ACTIVE' AND deleted_at IS NULL
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM subscribers WHERE status = 'ACTIVE'
    `,
  ])

  return apiSuccess({
    users: Number(userRows[0]?.n ?? 0),
    subscribers: Number(subRows[0]?.n ?? 0),
    recipients: Number(userRows[0]?.n ?? 0) + Number(subRows[0]?.n ?? 0),
  })
}
