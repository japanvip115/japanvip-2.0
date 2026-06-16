import { NextRequest } from 'next/server'
import { listPublicAuctions } from '@/modules/auction/services/auction.service'
import { apiSuccess, handleApiError } from '@/lib/api-response'
import type { AuctionStatus } from '@japanvip/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(24, parseInt(searchParams.get('limit') ?? '12'))
  const status = (searchParams.get('status') as AuctionStatus) ?? 'LIVE'
  const categoryId = searchParams.get('categoryId') ?? undefined

  try {
    const result = await listPublicAuctions({ page, limit, status, categoryId })
    return apiSuccess(result)
  } catch (err) {
    return handleApiError(err)
  }
}
