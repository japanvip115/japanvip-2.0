import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'] as const

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const item = await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        facts: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!item) return apiError('Không tìm thấy bài', 404)
    return apiSuccess({ item })
  } catch (err) {
    return handleApiError(err)
  }
}

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(2000).optional().nullable(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  sourceType: z.string().max(50).optional().nullable(),
  sourceUrl: z.string().max(1000).optional().nullable(),
  language: z.string().max(10).optional(),
  status: z.enum(STATUSES).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const input = patchSchema.parse(await req.json())
    const existing = await prisma.knowledgeArticle.findUnique({ where: { id }, select: { status: true, publishedAt: true } })
    if (!existing) return apiError('Không tìm thấy bài', 404)

    const data: Prisma.KnowledgeArticleUpdateInput = {}
    if (input.title !== undefined) data.title = input.title
    if (input.summary !== undefined) data.summary = input.summary
    if (input.content !== undefined) data.content = input.content
    if (input.tags !== undefined) data.tags = input.tags
    if (input.sourceType !== undefined) data.sourceType = input.sourceType
    if (input.sourceUrl !== undefined) data.sourceUrl = input.sourceUrl
    if (input.language !== undefined) data.language = input.language
    if (input.confidenceScore !== undefined) data.confidenceScore = input.confidenceScore
    if (input.categoryId !== undefined) {
      data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true }
    }
    if (input.status !== undefined) {
      data.status = input.status
      if (input.status === 'APPROVED') {
        data.reviewedBy = user.id
        if (!existing.publishedAt) data.publishedAt = new Date()
      }
    }

    const item = await prisma.knowledgeArticle.update({ where: { id }, data })
    await createAuditLog({
      userId: user.id, action: 'knowledge_article.update', resourceType: 'KnowledgeArticle', resourceId: id,
      oldValues: { status: existing.status }, newValues: { status: item.status },
    })
    return apiSuccess({ item }, 'Đã cập nhật')
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    // Gỡ liên kết fact khỏi bài trước khi xoá (không xoá fact).
    await prisma.knowledgeFact.updateMany({ where: { relatedArticleId: id }, data: { relatedArticleId: null } })
    await prisma.knowledgeArticle.delete({ where: { id } })
    await createAuditLog({ userId: user.id, action: 'knowledge_article.delete', resourceType: 'KnowledgeArticle', resourceId: id })
    return apiSuccess({ id }, 'Đã xoá bài')
  } catch (err) {
    return handleApiError(err)
  }
}
