import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  ogTitle: z.string().max(255).optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  robots: z.string().max(100).optional(),
  schemaJson: z.any().optional().nullable(),
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
    const page = await prisma.seoPage.update({ where: { id }, data })
    return apiSuccess(page)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    await prisma.seoPage.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
