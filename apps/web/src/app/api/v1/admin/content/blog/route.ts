import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  authorId: z.string().uuid(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1),
  thumbnailUrl: z.string().min(1).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
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

export async function POST(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const post = await prisma.blogPost.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    })
    return apiSuccess(post, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}
