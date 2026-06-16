import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getBfjOrderDetail, cancelBfjOrder } from '@/modules/bfj/services/bfj-order.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  try {
    const order = await getBfjOrderDetail(id, session.user!.id)
    if (!order) return apiError('Không tìm thấy đơn hàng', 404)
    return apiSuccess(order)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  try {
    const order = await cancelBfjOrder(id, session.user!.id)
    return apiSuccess(order, 'Đơn hàng đã được huỷ')
  } catch (err) {
    return handleApiError(err)
  }
}
