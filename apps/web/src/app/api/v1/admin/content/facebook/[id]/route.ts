import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { publishOnePost } from '@/lib/social/facebook-publish'

type Params = { params: Promise<{ id: string }> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAdmin = (s: any) => hasRole(s?.user?.role, 'ADMIN')

const patchSchema = z.object({
  message: z.string().min(5).max(5000).optional(),
  imageUrl: z.string().max(1000).optional().nullable(),
  linkUrl: z.string().max(1000).optional().nullable(),
  angle: z.enum(['product', 'promo', 'tips']).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED']).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const body = patchSchema.parse(await req.json())
    const post = await prisma.facebookPost.update({
      where: { id },
      data: {
        ...(body.message !== undefined ? { message: body.message } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
        ...(body.linkUrl !== undefined ? { linkUrl: body.linkUrl || null } : {}),
        ...(body.angle !== undefined ? { angle: body.angle } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } : {}),
      },
    })
    return apiSuccess({ post }, 'Đã cập nhật')
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    await prisma.facebookPost.delete({ where: { id } })
    return apiSuccess({}, 'Đã xoá')
  } catch (err) {
    return handleApiError(err)
  }
}

// Đăng ngay
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const r = await publishOnePost(id)
    if (!r.ok) return apiError(r.error ?? 'Đăng thất bại', 502)
    return apiSuccess({ postId: r.postId }, 'Đã đăng lên Facebook')
  } catch (err) {
    return handleApiError(err)
  }
}
