import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số, gạch ngang'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  icon: z.string().max(512).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDesc: z.string().optional().nullable(),
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
    const parentId = searchParams.get('parentId')

    const categories = await prisma.category.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(parentId === 'null' ? { parentId: null } : parentId ? { parentId } : {}),
      },
      include: {
        parent: { select: { name: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return apiSuccess(categories)
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

    const category = await prisma.category.create({ data })
    return apiSuccess(category, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}
