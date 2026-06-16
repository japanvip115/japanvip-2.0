import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1).optional(),
  thumbnailUrl: z.string().min(1).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
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
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    })
    return apiSuccess(post)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    await prisma.blogPost.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
