import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { placeBid } from '@/modules/auction/services/bid.service'
import { validateFingerprintServer } from '@/lib/device-fingerprint'
import { getClientIp } from '@/lib/get-client-ip'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  maxAmount: z.number().int().positive(),
  deviceFingerprint: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Vui lòng đăng nhập.', 401)

  // CSRF: exact origin match
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || (origin !== `https://${host}` && process.env.NODE_ENV !== 'development')) {
    return apiError('Forbidden', 403)
  }

  const { allowed } = await rateLimit(req, 'auction:max-bid', session.user.id)
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng chậm lại', 429)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      email: true,
      transactions: {
        where: { type: 'DEPOSIT', status: 'COMPLETED' },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!user?.emailVerified) {
    return NextResponse.json({
      success: false,
      error: 'EMAIL_NOT_VERIFIED',
      email: user?.email ?? '',
    }, { status: 403 })
  }

  if ((user?.transactions?.length ?? 0) === 0) {
    return NextResponse.json({
      success: false,
      error: 'DEPOSIT_REQUIRED',
    }, { status: 403 })
  }

  const { id: auctionId } = await params

  try {
    const body = schema.parse(await req.json())
    const ip = getClientIp(req)

    // Fetch auction to validate
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { status: true, currentPrice: true, minIncrement: true, endsAt: true, extendedEnd: true, winnerId: true },
    })
    if (!auction) return apiError('Phiên đấu giá không tồn tại', 404)
    if (auction.status !== 'LIVE') return apiError('Phiên đấu giá không còn hoạt động', 400)

    const now = new Date()
    const effectiveEnd = auction.extendedEnd ?? auction.endsAt
    if (now >= effectiveEnd) return apiError('Phiên đấu giá đã kết thúc', 400)

    const currentPrice = Number(auction.currentPrice)
    const minIncrement = Number(auction.minIncrement)
    const minRequired = currentPrice + minIncrement

    if (body.maxAmount < minRequired) {
      return apiError(`Max Bid phải ít nhất ${minRequired.toLocaleString('vi-VN')}₫`, 400)
    }

    // Upper bound: tối đa 200 bước giá (chống giá bất thường)
    const maxValidBid = minRequired + minIncrement * 200
    if (body.maxAmount > maxValidBid) {
      return apiError(`Max Bid tối đa ${maxValidBid.toLocaleString('vi-VN')}₫ cho phiên này`, 400)
    }

    const fp = validateFingerprintServer(body.deviceFingerprint) ? body.deviceFingerprint! : null

    // Upsert max bid record
    await prisma.auctionMaxBid.upsert({
      where: { auctionId_bidderId: { auctionId, bidderId: session.user.id } },
      create: { auctionId, bidderId: session.user.id, maxAmount: body.maxAmount, isActive: true },
      update: { maxAmount: body.maxAmount, isActive: true, updatedAt: new Date() },
    })
    void fp // deviceFingerprint stored in bid records, not in AuctionMaxBid (schema diff)

    // If already winning, no need to place a bid now
    if (auction.winnerId === session.user.id) {
      return apiSuccess({ alreadyWinning: true, maxAmount: body.maxAmount }, 'Max Bid đã được cập nhật')
    }

    // Place initial bid at minimum needed amount to win
    const result = await placeBid({
      auctionId,
      bidderId: session.user.id,
      amount: minRequired,
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
      skipWalletLock: true,
      isAutoBid: true,
    })

    return apiSuccess(result, 'Max Bid đã được đặt thành công')
  } catch (err) {
    return handleApiError(err)
  }
}

// GET: check if current user has active max bid
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Unauthorized', 401)

  const { id: auctionId } = await params

  try {
    const maxBid = await prisma.auctionMaxBid.findUnique({
      where: { auctionId_bidderId: { auctionId, bidderId: session.user.id } },
      select: { maxAmount: true, isActive: true },
    })
    return apiSuccess(maxBid ?? null)
  } catch (err) {
    return handleApiError(err)
  }
}

// DELETE: hủy max bid
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Unauthorized', 401)

  const { id: auctionId } = await params

  try {
    await prisma.auctionMaxBid.updateMany({
      where: { auctionId, bidderId: session.user.id },
      data: { isActive: false },
    })
    return apiSuccess(null, 'Đã hủy Max Bid')
  } catch (err) {
    return handleApiError(err)
  }
}
