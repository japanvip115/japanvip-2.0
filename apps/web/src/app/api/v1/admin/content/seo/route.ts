import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  pagePath: z.string().min(1).max(500),
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  ogTitle: z.string().max(255).optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  robots: z.string().max(100).default('index,follow'),
  schemaJson: z.any().optional().nullable(),
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
    const page = await prisma.seoPage.create({ data })
    return apiSuccess(page, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}
