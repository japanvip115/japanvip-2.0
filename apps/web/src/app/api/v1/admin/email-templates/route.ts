import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { TEMPLATE_META, type TemplateKey } from '@/lib/email-template.service'

const KEYS = Object.keys(TEMPLATE_META) as TemplateKey[]

export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  const rows = await prisma.emailTemplate.findMany()
  const byKey = new Map(rows.map((r) => [r.key, r]))

  const data = KEYS.map((key) => {
    const row = byKey.get(key)
    return {
      key,
      ...TEMPLATE_META[key],
      enabled: row?.enabled ?? false,
      subject: row?.subject ?? '',
      html: row?.html ?? '',
    }
  })
  return apiSuccess(data)
}

const updateSchema = z.object({
  key: z.enum(KEYS as [TemplateKey, ...TemplateKey[]]),
  enabled: z.boolean().optional(),
  subject: z.string().max(300).optional(),
  html: z.string().max(200000).optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { key, enabled, subject, html } = updateSchema.parse(await req.json())

    // Chặn bật template rỗng / thiếu placeholder bắt buộc
    if (enabled) {
      const finalHtml = html ?? (await prisma.emailTemplate.findUnique({ where: { key }, select: { html: true } }))?.html ?? ''
      if (!finalHtml.trim()) return apiError('Chưa có nội dung HTML để bật template này', 400)
      for (const r of TEMPLATE_META[key].required) {
        if (!new RegExp(`\\{\\{\\s*${r}\\s*\\}\\}`).test(finalHtml)) {
          return apiError(`Template thiếu placeholder bắt buộc {{${r}}}`, 400)
        }
      }
    }

    await prisma.emailTemplate.upsert({
      where: { key },
      create: { key, enabled: enabled ?? false, subject: subject || null, html: html ?? '' },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(subject !== undefined && { subject: subject || null }),
        ...(html !== undefined && { html }),
      },
    })
    return apiSuccess({ ok: true })
  } catch (e) {
    return handleApiError(e)
  }
}
