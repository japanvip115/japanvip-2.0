import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  title: z.string().min(1).max(255).optional(),
  imageUrl: z.string().min(1).optional(),
  linkUrl: z.string().optional().nullable(),
  position: z.string().max(100).optional(),
  sortOrder: z.number().int().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    const body = await req.json()
    const data = schema.parse(body)
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt === null ? null : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt === null ? null : undefined,
      },
    })
    return apiSuccess(banner)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    await prisma.banner.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
