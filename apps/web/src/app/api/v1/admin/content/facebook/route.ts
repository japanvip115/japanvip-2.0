import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAdmin = (s: any) => hasRole(s?.user?.role, 'ADMIN')

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)

  const posts = await prisma.facebookPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, message: true, imageUrl: true, linkUrl: true, angle: true,
      status: true, scheduledAt: true, publishedAt: true, fbPostId: true, errorMessage: true, createdAt: true,
    },
  })
  return apiSuccess({ posts })
}

const createSchema = z.object({
  message: z.string().min(5).max(5000),
  imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
  linkUrl: z.string().url().max(1000).optional().or(z.literal('')),
  angle: z.enum(['product', 'promo', 'tips']).default('product'),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('DRAFT'),
  scheduledAt: z.string().datetime().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)

  try {
    const body = createSchema.parse(await req.json())
    if (body.status === 'SCHEDULED' && !body.scheduledAt) {
      return apiError('Cần chọn thời gian đăng khi lên lịch.', 400)
    }
    const post = await prisma.facebookPost.create({
      data: {
        message: body.message,
        imageUrl: body.imageUrl || null,
        linkUrl: body.linkUrl || null,
        angle: body.angle,
        status: body.status,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        productId: body.productId || null,
        createdBy: session!.user!.id,
      },
    })
    return apiSuccess({ post }, 'Đã lưu bài đăng')
  } catch (err) {
    return handleApiError(err)
  }
}
