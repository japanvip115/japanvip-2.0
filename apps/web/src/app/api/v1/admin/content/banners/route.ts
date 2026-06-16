import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  title: z.string().min(1).max(255),
  imageUrl: z.string().min(1),
  linkUrl: z.string().optional().nullable(),
  position: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
})

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

export async function POST(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const banner = await prisma.banner.create({
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    })
    return apiSuccess(banner, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}
