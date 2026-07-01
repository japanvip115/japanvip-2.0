import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) })

// Xoá hàng loạt SP (bỏ qua SP đang có phiên đấu giá — như xoá đơn)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const { ids } = schema.parse(await req.json())
    const withAuctions = await prisma.auction.findMany({
      where: { productId: { in: ids } },
      select: { productId: true },
      distinct: ['productId'],
    })
    const blocked = new Set(withAuctions.map((a) => a.productId))
    const deletable = ids.filter((id) => !blocked.has(id))
    const res = deletable.length ? await prisma.product.deleteMany({ where: { id: { in: deletable } } }) : { count: 0 }

    return apiSuccess(
      { deleted: res.count, skipped: blocked.size },
      `Đã xoá ${res.count} sản phẩm${blocked.size ? ` · bỏ qua ${blocked.size} SP đang đấu giá` : ''}`,
    )
  } catch (err) {
    return handleApiError(err)
  }
}
