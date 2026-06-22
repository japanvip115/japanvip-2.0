import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const PAGE_SIZE = 50

const addSchema = z.object({
  email: z.string().email(),
  name: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') || 1))
  const q = sp.get('q')?.trim() || ''
  const status = sp.get('status') || ''

  const where: any = {}
  if (q) where.OR = [
    { email: { contains: q, mode: 'insensitive' } },
    { name: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q } },
  ]
  if (status === 'ACTIVE' || status === 'UNSUBSCRIBED' || status === 'BOUNCED') where.status = status

  const [total, items] = await Promise.all([
    prisma.subscriber.count({ where }),
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, email: true, name: true, phone: true, city: true, status: true, source: true, createdAt: true },
    }),
  ])

  return apiSuccess({ items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const body = addSchema.parse(await req.json())
    const existing = await prisma.subscriber.findUnique({ where: { email: body.email } })
    if (existing) return apiError('Email đã tồn tại trong danh sách', 409)

    const sub = await prisma.subscriber.create({ data: { ...body, source: body.source || 'manual' } })
    return apiSuccess(sub, 'Đã thêm subscriber')
  } catch (err) {
    return handleApiError(err)
  }
}
