import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { AUTOMATION_DEFAULTS, AUTOMATION_META, type AutomationKey } from '@/lib/automation-config'

const KEYS = Object.keys(AUTOMATION_DEFAULTS) as AutomationKey[]

export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  const rows = await prisma.emailAutomation.findMany()
  const byKey = new Map(rows.map((r) => [r.key, r]))

  const data = KEYS.map((key) => {
    const def = AUTOMATION_DEFAULTS[key]
    const row = byKey.get(key)
    return {
      key,
      ...AUTOMATION_META[key],
      enabled: row?.enabled ?? def.enabled,
      config: { ...def.config, ...((row?.config as object) ?? {}) },
    }
  })
  return apiSuccess(data)
}

const updateSchema = z.object({
  key: z.enum(KEYS as [AutomationKey, ...AutomationKey[]]),
  enabled: z.boolean().optional(),
  config: z.object({
    hours: z.number().int().min(1).max(168).optional(),
    days: z.number().int().min(1).max(365).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
  }).optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { key, enabled, config } = updateSchema.parse(await req.json())
    const def = AUTOMATION_DEFAULTS[key]
    const mergedConfig = { ...def.config, ...(config ?? {}) }

    await prisma.emailAutomation.upsert({
      where: { key },
      create: { key, enabled: enabled ?? def.enabled, config: mergedConfig },
      update: { ...(enabled !== undefined && { enabled }), ...(config !== undefined && { config: mergedConfig }) },
    })
    return apiSuccess({ ok: true })
  } catch (e) {
    return handleApiError(e)
  }
}
