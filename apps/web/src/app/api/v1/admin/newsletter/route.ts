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

const BATCH = 40 // gửi tối đa 40 email/lần gọi để tránh timeout; client gọi lại tới khi hết

const schema = z.object({
  subject: z.string().min(3).max(200),
  bodyHtml: z.string().min(3).max(50000),
  campaignId: z.string().max(64).optional(),
})

type Recipient = { id: string; email: string; fullName: string | null }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { subject, bodyHtml, campaignId: cid } = schema.parse(await req.json())
    const campaignId = cid || `nl_${randomBytes(8).toString('hex')}`

    const recipients = await prisma.$queryRaw<Recipient[]>`
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

    let sent = 0
    for (const u of recipients) {
      try {
        const token = await ensureUnsubscribeToken(u.id)
        await sendNewsletterEmail({ email: u.email, fullName: u.fullName || 'bạn', subject, bodyHtml, unsubscribeUrl: buildUnsubscribeUrl(token) })
        await prisma.emailLog.create({ data: { email: u.email, type: 'newsletter', userId: u.id, meta: { campaignId } } })
        sent++
      } catch (err) {
        console.error('newsletter send failed for', u.email, err)
      }
    }

    return apiSuccess({ campaignId, sent, hasMore: recipients.length === BATCH }, `Đã gửi ${sent} email`)
  } catch (err) {
    return handleApiError(err)
  }
}

// Đếm số người sẽ nhận (preview trước khi gửi)
export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*)::bigint AS n FROM users
    WHERE marketing_opt_in = true AND email_verified = true AND role = 'CUSTOMER' AND status = 'ACTIVE' AND deleted_at IS NULL
  `
  return apiSuccess({ recipients: Number(rows[0]?.n ?? 0) })
}
