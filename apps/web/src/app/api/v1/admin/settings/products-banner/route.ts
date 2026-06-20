import type { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const KEYS = ['products_banner_url', 'products_banner_position'] as const

export async function GET() {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...KEYS] } } })
  const data: Record<string, string> = {}
  for (const key of KEYS) {
    data[key] = rows.find((r) => r.key === key)?.value ?? ''
  }
  return apiSuccess(data)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = await req.json()
    await prisma.$transaction(
      KEYS.filter((k) => k in body).map((key) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: { key, value: body[key] ?? '' },
          update: { value: body[key] ?? '' },
        })
      )
    )
    return apiSuccess({ updated: true })
  } catch (err) {
    return handleApiError(err)
  }
}
