import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const VERIFICATIONS = ['UNVERIFIED', 'VERIFIED', 'DISPUTED'] as const

const patchSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  predicate: z.string().min(1).max(255).optional(),
  object: z.string().min(1).optional(),
  sourceReference: z.string().max(1000).optional().nullable(),
  confidenceScore: z.number().int().min(0).max(100).optional().nullable(),
  verificationStatus: z.enum(VERIFICATIONS).optional(),
  relatedProductId: z.string().uuid().optional().nullable(),
  relatedArticleId: z.string().uuid().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const input = patchSchema.parse(await req.json())
    const data: Prisma.KnowledgeFactUpdateInput = {}
    if (input.subject !== undefined) data.subject = input.subject
    if (input.predicate !== undefined) data.predicate = input.predicate
    if (input.object !== undefined) data.object = input.object
    if (input.sourceReference !== undefined) data.sourceReference = input.sourceReference
    if (input.confidenceScore !== undefined) data.confidenceScore = input.confidenceScore
    if (input.verificationStatus !== undefined) data.verificationStatus = input.verificationStatus
    if (input.relatedProductId !== undefined) data.relatedProductId = input.relatedProductId
    if (input.relatedArticleId !== undefined) {
      data.article = input.relatedArticleId ? { connect: { id: input.relatedArticleId } } : { disconnect: true }
    }
    const item = await prisma.knowledgeFact.update({ where: { id }, data })
    await createAuditLog({ userId: user.id, action: 'knowledge_fact.update', resourceType: 'KnowledgeFact', resourceId: id })
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
    await prisma.knowledgeFact.delete({ where: { id } })
    await createAuditLog({ userId: user.id, action: 'knowledge_fact.delete', resourceType: 'KnowledgeFact', resourceId: id })
    return apiSuccess({ id }, 'Đã xoá fact')
  } catch (err) {
    return handleApiError(err)
  }
}
