import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
})

const LABEL: Record<string, string> = { ACTIVE: 'Đang bán', DRAFT: 'Bản nháp', ARCHIVED: 'Lưu kho' }

// Đổi trạng thái hàng loạt (đăng web = ACTIVE, về nháp = DRAFT)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const { ids, status } = schema.parse(await req.json())
    const res = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } })
    return apiSuccess({ updated: res.count }, `Đã chuyển ${res.count} sản phẩm → ${LABEL[status]}`)
  } catch (err) {
    return handleApiError(err)
  }
}
