import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { createAuction, adminListAuctions } from '@/modules/auction/services/auction.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { AuctionStatus } from '@japanvip/db'

const createSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['JAPANVIP_OWNED', 'PARTNER_CONSIGNMENT']).default('JAPANVIP_OWNED'),
  partnerId: z.string().uuid().optional(),
  startPrice: z.number().int().positive(),
  reservePrice: z.number().int().positive().optional(),
  buyNowPrice: z.number().int().positive().optional(),
  minIncrement: z.number().int().positive().default(10000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  autoExtend: z.boolean().default(true),
  extendMinutes: z.number().int().min(1).default(5),
  extendTrigger: z.number().int().min(1).default(3),
  commissionRate: z.number().min(0).max(1).default(0.10),
  buyerPremium: z.number().min(0).max(1).default(0.03),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('DRAFT'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = createSchema.parse(await req.json())
    const auction = await createAuction({
      ...body,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      createdBy: session.user!.id,
    })
    return apiSuccess(auction, 'Đã tạo phiên đấu giá', 201)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const status = searchParams.get('status') as AuctionStatus | null

  try {
    const result = await adminListAuctions({ page, status: status ?? undefined })
    return apiSuccess(result)
  } catch (err) {
    return handleApiError(err)
  }
}
