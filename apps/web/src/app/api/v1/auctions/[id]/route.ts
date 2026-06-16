import { NextRequest } from 'next/server'
import { getAuctionDetail } from '@/modules/auction/services/auction.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const auction = await getAuctionDetail(id)
    if (!auction) return apiError('Phiên đấu giá không tồn tại', 404)
    return apiSuccess(auction)
  } catch (err) {
    return handleApiError(err)
  }
}
