import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

const schema = z.object({
  productId: z.string().uuid(),
  price: z.number().positive().max(10_000_000_000),
})

// Áp giá bán mới cho SP (người duyệt bấm) → cập nhật salePrice + ghi AuditLog.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = schema.parse(await req.json())

    const current = await prisma.product.findUnique({
      where: { id: body.productId },
      select: { salePrice: true },
    })
    if (!current) return apiError('Không tìm thấy sản phẩm', 404)

    const oldPrice = current.salePrice != null ? Number(current.salePrice) : null

    await prisma.product.update({
      where: { id: body.productId },
      data: { salePrice: body.price },
    })

    await createAuditLog({
      userId: (session.user as any).id,
      action: 'PRICE_UPDATE',
      resourceType: 'Product',
      resourceId: body.productId,
      oldValues: { salePrice: oldPrice },
      newValues: { salePrice: body.price },
    })

    return apiSuccess({ productId: body.productId, salePrice: body.price }, 'Đã áp giá')
  } catch (err) {
    return handleApiError(err)
  }
}
