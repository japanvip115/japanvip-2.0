import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số, gạch ngang'),
  logoUrl: z.string().min(1).optional().nullable(),
  country: z.string().max(100).default('Japan'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

export async function GET(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') ?? ''

    const brands = await prisma.brand.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return apiSuccess(brands)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const brand = await prisma.brand.create({ data })
    return apiSuccess(brand, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}
