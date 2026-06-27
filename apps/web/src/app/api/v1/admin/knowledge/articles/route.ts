import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { slugify, uniqueSlug } from '@/lib/slug'

const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const take = Math.min(50, Math.max(1, Number(sp.get('take') ?? '20')))
    const status = sp.get('status')
    const categoryId = sp.get('categoryId')
    const q = sp.get('q')?.trim()

    const where: Prisma.KnowledgeArticleWhereInput = {}
    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) where.status = status as (typeof STATUSES)[number]
    if (categoryId) where.categoryId = categoryId
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }]

    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * take,
        take,
        select: {
          id: true, title: true, slug: true, summary: true, status: true, tags: true,
          confidenceScore: true, updatedAt: true, createdAt: true,
          category: { select: { id: true, name: true } },
          _count: { select: { facts: true } },
        },
      }),
      prisma.knowledgeArticle.count({ where }),
    ])
    return apiSuccess({ items, total, page, take, totalPages: Math.ceil(total / take) })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().max(500).optional(),
  summary: z.string().max(2000).optional(),
  content: z.string().min(1),
  tags: z.array(z.string().max(50)).max(30).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  sourceType: z.string().max(50).optional(),
  sourceUrl: z.string().max(1000).optional(),
  language: z.string().max(10).optional(),
  status: z.enum(STATUSES).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const input = createSchema.parse(await req.json())
    const slug = await uniqueSlug(slugify(input.slug || input.title), async (s) =>
      !!(await prisma.knowledgeArticle.findUnique({ where: { slug: s } })),
    )
    const status = input.status ?? 'DRAFT'
    const item = await prisma.knowledgeArticle.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary ?? null,
        content: input.content,
        tags: input.tags ?? [],
        categoryId: input.categoryId ?? null,
        sourceType: input.sourceType ?? null,
        sourceUrl: input.sourceUrl ?? null,
        language: input.language ?? 'vi',
        status,
        confidenceScore: input.confidenceScore ?? null,
        createdBy: user.id,
        publishedAt: status === 'APPROVED' ? new Date() : null,
        reviewedBy: status === 'APPROVED' ? user.id : null,
      },
    })
    await createAuditLog({ userId: user.id, action: 'knowledge_article.create', resourceType: 'KnowledgeArticle', resourceId: item.id, newValues: { status } })
    return apiSuccess({ item }, 'Đã tạo bài tri thức', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
