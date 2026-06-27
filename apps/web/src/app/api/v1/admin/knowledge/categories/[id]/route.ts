import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const input = patchSchema.parse(await req.json())
    const item = await prisma.knowledgeCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    })
    await createAuditLog({ userId: user.id, action: 'knowledge_category.update', resourceType: 'KnowledgeCategory', resourceId: id })
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
    // Gỡ liên kết bài viết khỏi danh mục trước khi xoá (không xoá bài).
    await prisma.knowledgeArticle.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    await prisma.knowledgeCategory.delete({ where: { id } })
    await createAuditLog({ userId: user.id, action: 'knowledge_category.delete', resourceType: 'KnowledgeCategory', resourceId: id })
    return apiSuccess({ id }, 'Đã xoá danh mục')
  } catch (err) {
    return handleApiError(err)
  }
}
