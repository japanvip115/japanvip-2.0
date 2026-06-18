import type { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { z } from 'zod'
import { HOME_CONTENT_KEYS } from '@/lib/home-content-keys'

export async function GET() {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...HOME_CONTENT_KEYS] } },
  })
  const data: Record<string, string> = {}
  for (const key of HOME_CONTENT_KEYS) {
    data[key] = rows.find((r) => r.key === key)?.value ?? ''
  }
  return apiSuccess(data)
}

const schema = z.record(z.string())

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = schema.parse(await req.json())
    const updates = HOME_CONTENT_KEYS.filter((k) => k in body && body[k] !== undefined)

    await prisma.$transaction(
      updates.map((key) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: { key, value: body[key]! },
          update: { value: body[key]! },
        })
      )
    )
    return apiSuccess({ updated: updates.length })
  } catch (err) {
    return handleApiError(err)
  }
}
