import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { updateAuctionStatus, getAuctionDetail } from '@/modules/auction/services/auction.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { AuctionStatus } from '@japanvip/db'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'SETTLED'] as const).optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params
  try {
    const auction = await getAuctionDetail(id)
    if (!auction) return apiError('Phiên đấu giá không tồn tại', 404)
    return apiSuccess(auction)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params
  try {
    const body = updateSchema.parse(await req.json())
    if (body.status) {
      const updated = await updateAuctionStatus(id, body.status as AuctionStatus, session.user!.id)
      return apiSuccess(updated, 'Đã cập nhật trạng thái')
    }
    return apiError('Không có thay đổi', 400)
  } catch (err) {
    return handleApiError(err)
  }
}
