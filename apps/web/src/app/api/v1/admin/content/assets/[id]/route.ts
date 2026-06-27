import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const STATUSES = [
  'DRAFT', 'AI_GENERATED', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'APPROVED',
  'SCHEDULED', 'PUBLISHED', 'REJECTED', 'ARCHIVED',
] as const

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  publishedUrl: z.string().max(1000).optional().nullable(),
  reviewNote: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const REVIEW_STATUSES = new Set(['APPROVED', 'REJECTED', 'REVISION_REQUIRED'])

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  const { id } = await params

  try {
    const input = patchSchema.parse(await req.json())
    const existing = await prisma.contentAsset.findUnique({ where: { id }, select: { status: true } })
    if (!existing) return apiError('Không tìm thấy nội dung', 404)

    const data: Prisma.ContentAssetUpdateInput = {}
    if (input.title !== undefined) data.title = input.title
    if (input.body !== undefined) data.body = input.body
    if (input.reviewNote !== undefined) data.reviewNote = input.reviewNote
    if (input.publishedUrl !== undefined) data.publishedUrl = input.publishedUrl
    if (input.metadata !== undefined) data.metadata = input.metadata as Prisma.InputJsonValue
    if (input.scheduledAt !== undefined) {
      data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
    }
    if (input.status !== undefined) {
      data.status = input.status
      if (REVIEW_STATUSES.has(input.status)) data.reviewedBy = user.id
      if (input.status === 'PUBLISHED') data.publishedAt = new Date()
    }

    const asset = await prisma.contentAsset.update({ where: { id }, data })
    await createAuditLog({
      userId: user.id,
      action: 'content_asset.update',
      resourceType: 'ContentAsset',
      resourceId: id,
      oldValues: { status: existing.status },
      newValues: { status: asset.status },
    })
    return apiSuccess({ asset }, 'Đã cập nhật')
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
    await prisma.contentAsset.delete({ where: { id } })
    await createAuditLog({
      userId: user.id,
      action: 'content_asset.delete',
      resourceType: 'ContentAsset',
      resourceId: id,
    })
    return apiSuccess({ id }, 'Đã xoá')
  } catch (err) {
    return handleApiError(err)
  }
}
