import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

const VERIFICATIONS = ['UNVERIFIED', 'VERIFIED', 'DISPUTED'] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const take = Math.min(100, Math.max(1, Number(sp.get('take') ?? '50')))
    const verification = sp.get('verification')
    const relatedProductId = sp.get('relatedProductId')
    const q = sp.get('q')?.trim()

    const where: Prisma.KnowledgeFactWhereInput = {}
    if (verification && VERIFICATIONS.includes(verification as (typeof VERIFICATIONS)[number])) {
      where.verificationStatus = verification as (typeof VERIFICATIONS)[number]
    }
    if (relatedProductId) where.relatedProductId = relatedProductId
    if (q) where.OR = [{ subject: { contains: q, mode: 'insensitive' } }, { object: { contains: q, mode: 'insensitive' } }]

    const [items, total] = await Promise.all([
      prisma.knowledgeFact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * take,
        take,
        include: { article: { select: { id: true, title: true } } },
      }),
      prisma.knowledgeFact.count({ where }),
    ])
    return apiSuccess({ items, total, page, take, totalPages: Math.ceil(total / take) })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  subject: z.string().min(1).max(500),
  predicate: z.string().min(1).max(255),
  object: z.string().min(1),
  sourceReference: z.string().max(1000).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  verificationStatus: z.enum(VERIFICATIONS).optional(),
  relatedProductId: z.string().uuid().optional(),
  relatedArticleId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const input = createSchema.parse(await req.json())
    const item = await prisma.knowledgeFact.create({
      data: {
        subject: input.subject,
        predicate: input.predicate,
        object: input.object,
        sourceReference: input.sourceReference ?? null,
        confidenceScore: input.confidenceScore ?? null,
        verificationStatus: input.verificationStatus ?? 'UNVERIFIED',
        relatedProductId: input.relatedProductId ?? null,
        relatedArticleId: input.relatedArticleId ?? null,
        createdBy: user.id,
      },
    })
    await createAuditLog({ userId: user.id, action: 'knowledge_fact.create', resourceType: 'KnowledgeFact', resourceId: item.id })
    return apiSuccess({ item }, 'Đã tạo fact', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
