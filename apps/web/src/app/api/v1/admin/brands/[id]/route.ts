import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  logoUrl: z.string().min(1).optional().nullable(),
  country: z.string().max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

async function guard(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    const body = await req.json()
    const data = schema.parse(body)
    const brand = await prisma.brand.update({ where: { id }, data })
    return apiSuccess(brand)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await guard(req)
  if (err) return err

  const { id } = await params
  try {
    const count = await prisma.product.count({ where: { brandId: id } })
    if (count > 0) return apiError(`Thương hiệu đang có ${count} sản phẩm, không thể xóa`, 409)

    await prisma.brand.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
