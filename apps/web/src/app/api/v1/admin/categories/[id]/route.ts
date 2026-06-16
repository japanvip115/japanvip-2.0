import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  icon: z.string().max(512).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDesc: z.string().optional().nullable(),
})

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
    })
    if (!category) return apiError('Không tìm thấy danh mục', 404)
    return apiSuccess(category)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    const body = await req.json()
    const data = schema.parse(body)
    const category = await prisma.category.update({ where: { id }, data })
    return apiSuccess(category)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) return apiError(`Danh mục đang có ${count} sản phẩm, không thể xóa`, 409)

    await prisma.category.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
