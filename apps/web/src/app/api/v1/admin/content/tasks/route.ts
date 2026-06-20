import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const createSchema = z.object({
  type: z.enum(['PRODUCT_DESCRIPTION', 'BLOG_POST', 'FAQ', 'SEO_META']),
  scheduledAt: z.string().datetime(),
  title: z.string().min(1).max(500),
  topic: z.string().optional(),
  keywords: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  productId: z.string().uuid().optional(),
  provider: z.string().default('anthropic'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const month = searchParams.get('month') // YYYY-MM

  const where: any = {}
  if (status) where.status = status
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parts = month.split('-')
    const y = parseInt(parts[0]!, 10)
    const m = parseInt(parts[1]!, 10)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    where.scheduledAt = { gte: start, lt: end }
  }

  const tasks = await prisma.contentTask.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    take: 200,
  })

  return apiSuccess(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const body = createSchema.parse(await req.json())
    const task = await prisma.contentTask.create({
      data: {
        ...body,
        sourceUrl: body.sourceUrl || null,
        productId: body.productId || null,
        topic: body.topic || null,
        keywords: body.keywords || null,
        createdBy: session!.user!.id,
      },
    })
    return apiSuccess(task, undefined, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
