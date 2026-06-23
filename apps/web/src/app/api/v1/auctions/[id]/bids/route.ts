import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { redisGet, redisSet } from '@/lib/redis'
import { placeBid, getBidHistory } from '@/modules/auction/services/bid.service'
import { runFraudCheck, runFraudPreCheck } from '@/modules/auction/services/fraud.service'
import { rateLimit } from '@/lib/rate-limit'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { isFraudRuleEnabled, getFraudSetting, writeAuditLog } from '@/lib/fraud-settings'
import { validateFingerprintServer } from '@/lib/device-fingerprint'
import { getClientIp } from '@/lib/get-client-ip'
import { checkBidLiability } from '@/modules/auction/services/liability.service'
import { processFirstBidReferral } from '@/lib/referral.service'

type Params = { params: Promise<{ id: string }> }

const bidSchema = z.object({
  amount: z.number().int().positive(),
  deviceFingerprint: z.string().optional(),
  otpCode: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Vui lòng đăng nhập để đặt giá.', 401)

  const userId = session.user.id
  const ip = getClientIp(req)

  // CSRF: exact origin match only
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  const allowedOrigin = `https://${host}`
  if (!origin || (origin !== allowedOrigin && process.env.NODE_ENV !== 'development')) {
    return apiError('Forbidden', 403)
  }

  // Idempotency — enforce UUID format, return cached response if duplicate
  const idempotencyKey = req.headers.get('x-idempotency-key')
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(idempotencyKey)) {
    return apiError('x-idempotency-key (UUID v4) là bắt buộc', 400)
  }
  const idemCacheKey = `idem:bid:${userId}:${idempotencyKey}`
  const cachedResponse = await redisGet(idemCacheKey)
  if (cachedResponse) {
    return NextResponse.json(JSON.parse(cachedResponse))
  }

  // Rate limit per-user (prevents bypass via IP rotation)
  const { allowed } = await rateLimit(req, 'auction:bid', userId)
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng chậm lại', 429)

  // Blocked IP check
  if (ip !== 'unknown') {
    const blocked = await prisma.blockedIp.findUnique({ where: { ip } }).catch(() => null)
    if (blocked) {
      return NextResponse.json(
        { success: false, error: 'IP của bạn đã bị chặn. Vui lòng liên hệ admin.', code: 'IP_BLOCKED' },
        { status: 403 }
      )
    }
  }

  // Require verified email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      email: true,
      status: true,
      createdAt: true,
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
      message: 'Vui lòng xác thực email trước khi tham gia đấu giá.',
      email: user?.email ?? '',
    }, { status: 403 })
  }

  // Suspended check
  if (user.status === 'SUSPENDED') {
    return NextResponse.json({ success: false, error: 'Tài khoản bị khóa do vi phạm.', code: 'SUSPENDED' }, { status: 403 })
  }

  // Require approved deposit
  const hasApprovedDeposit = (user.transactions?.length ?? 0) > 0
  if (!hasApprovedDeposit) {
    return NextResponse.json({
      success: false,
      error: 'DEPOSIT_REQUIRED',
      message: 'Quý khách cần đặt cọc và được Japan VIP xác nhận trước khi tham gia đấu giá.',
    }, { status: 403 })
  }

  const { id: auctionId } = await params

  let body: z.infer<typeof bidSchema>
  try {
    body = bidSchema.parse(await req.json())
  } catch {
    return apiError('Dữ liệu không hợp lệ', 400)
  }

  const deviceFingerprint = validateFingerprintServer(body.deviceFingerprint) ? body.deviceFingerprint! : null

  // Deposit liability — bid ≤ 20× cọc, và tổng liability across phiên ≤ 10× cọc
  const liabilityError = await checkBidLiability(userId, auctionId, body.amount)
  if (liabilityError) {
    return NextResponse.json({
      success: false,
      error: liabilityError.code,
      message: liabilityError.message,
      code: liabilityError.code,
    }, { status: 403 })
  }

  // Cooling-off — nếu bật, check user có thắng phiên cùng category trong N ngày không
  if (await isFraudRuleEnabled('COOLING_OFF')) {
    const coolingDays = parseInt(await getFraudSetting('COOLING_OFF_DAYS') || '7', 10)
    const auctionWithCategory = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { product: { select: { categoryId: true } } },
    })
    const categoryId = auctionWithCategory?.product?.categoryId
    if (categoryId) {
      const recentWin = await prisma.auction.findFirst({
        where: {
          winnerId: userId,
          endsAt: { gte: new Date(Date.now() - coolingDays * 24 * 60 * 60 * 1000) },
          product: { categoryId },
        },
        select: { id: true },
      })
      if (recentWin) {
        return NextResponse.json({
          success: false,
          error: 'COOLING_OFF',
          message: `Bạn vừa thắng một phiên cùng danh mục trong ${coolingDays} ngày qua. Vui lòng chờ hết thời gian cooling-off.`,
          code: 'COOLING_OFF',
        }, { status: 403 })
      }
    }
  }

  // Fetch auction
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { status: true, currentPrice: true, minIncrement: true, startPrice: true, endsAt: true, extendedEnd: true, createdBy: true, partnerId: true },
  })
  if (!auction) return apiError('Phiên đấu giá không tồn tại', 404)
  if (auction.status !== 'LIVE') return apiError('Phiên đấu giá không còn hoạt động', 400)

  // Chống shill-bid: người tạo phiên / chủ ký gửi không được tự đặt giá
  if (auction.createdBy === userId || auction.partnerId === userId) {
    return NextResponse.json({
      success: false,
      error: 'Người tạo hoặc chủ phiên đấu giá không thể tham gia đặt giá.',
      code: 'SELF_BID_FORBIDDEN',
    }, { status: 403 })
  }

  const currentPrice = Number(auction.currentPrice)
  const minIncrement = Number(auction.minIncrement)
  const startPrice = Number(auction.startPrice)
  const minNextBid = currentPrice + minIncrement

  // Max bid upper limit: tối đa +50 bước giá (chống bid sai)
  const maxValidBid = minNextBid + minIncrement * 50
  if (body.amount > maxValidBid) {
    return NextResponse.json({
      success: false,
      error: `Giá đặt quá cao. Tối đa: ${maxValidBid.toLocaleString('vi-VN')}₫`,
      code: 'BID_TOO_HIGH',
    }, { status: 400 })
  }

  // BID_VELOCITY check — số bid trong 1 phút
  if (await isFraudRuleEnabled('BID_VELOCITY')) {
    const maxPerMin = parseInt(await getFraudSetting('BID_VELOCITY_MAX') || '10')
    const recentCount = await prisma.bid.count({
      where: {
        auctionId,
        bidderId: userId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    })
    if (recentCount >= maxPerMin) {
      writeAuditLog({
        eventType: 'BID_BLOCKED',
        userId,
        detail: { reason: 'BID_VELOCITY', recentCount, maxPerMin, auctionId },
        ipAddress: ip,
      }).catch(() => {})
      return NextResponse.json(
        { success: false, error: `Đặt giá quá nhanh. Tối đa ${maxPerMin} lần/phút.`, code: 'BID_VELOCITY' },
        { status: 429 }
      )
    }
  }

  // Fraud pre-check ĐỒNG BỘ — block trước khi lưu DB
  const preCheck = await runFraudPreCheck({
    auctionId,
    bidderId: userId,
    amount: body.amount,
    ipAddress: ip === 'unknown' ? null : ip,
    deviceFingerprint,
    bidderCreatedAt: user.createdAt,
    startPrice,
  })
  if (preCheck.blocked) {
    writeAuditLog({
      eventType: 'BID_BLOCKED',
      userId,
      detail: { reason: 'FRAUD_PRE_CHECK', flags: preCheck.flags, score: preCheck.score, auctionId },
      ipAddress: ip,
    }).catch(() => {})
    return NextResponse.json(
      { success: false, error: 'Bid bị từ chối do phát hiện hoạt động bất thường. Vui lòng liên hệ admin.', code: 'FRAUD_BLOCKED' },
      { status: 403 }
    )
  }

  // OTP_HIGH_VALUE — yêu cầu OTP cho bid lớn
  if (await isFraudRuleEnabled('OTP_HIGH_VALUE')) {
    const otpThreshold = parseInt(await getFraudSetting('BID_OTP_THRESHOLD'), 10) || 500_000_000
    if (body.amount >= otpThreshold) {
      if (!body.otpCode) {
        return NextResponse.json({
          success: false,
          code: 'OTP_REQUIRED',
          error: 'Bid lớn yêu cầu xác nhận OTP. Vui lòng nhấn "Gửi OTP" để nhận mã.',
          threshold: otpThreshold,
        }, { status: 428 })
      }
      // Validate OTP
      const otpRecord = await prisma.bidConfirmOtp.findFirst({
        where: { userId, auctionId, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (!otpRecord) {
        return apiError('Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.', 400)
      }
      if (otpRecord.otp !== String(body.otpCode)) {
        return apiError('Mã OTP không đúng. Vui lòng kiểm tra lại.', 400)
      }
      // OTP phải khớp với số tiền đã yêu cầu (chống swap amount)
      if (otpRecord.amount && Number(otpRecord.amount) !== body.amount) {
        return apiError('Mã OTP này không hợp lệ cho số tiền bid hiện tại.', 400)
      }
      // Atomic claim — chỉ 1 request đồng thời chiếm được OTP (chống reuse)
      const otpClaim = await prisma.bidConfirmOtp.updateMany({
        where: { id: otpRecord.id, used: false },
        data: { used: true },
      })
      if (otpClaim.count !== 1) {
        return apiError('Mã OTP đã được sử dụng. Vui lòng yêu cầu mã mới.', 400)
      }
    }
  }

  try {
    const result = await placeBid({
      auctionId,
      bidderId: userId,
      amount: body.amount,
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
      skipWalletLock: true,
      isAutoBid: false,
    })

    // Audit log bid thành công
    writeAuditLog({
      eventType: 'BID_PLACED',
      userId,
      detail: { auctionId, amount: body.amount, deviceFingerprint },
      ipAddress: ip,
    }).catch(() => {})

    // Async fraud check — không block response
    runFraudCheck({
      bidId: result.bid.id,
      auctionId,
      bidderId: userId,
      amount: body.amount,
      ipAddress: ip === 'unknown' ? null : ip,
      deviceFingerprint,
      bidderCreatedAt: user.createdAt,
      startPrice,
    }).catch(() => {})

    // Update bid record with device fingerprint
    if (deviceFingerprint) {
      prisma.bid.update({
        where: { id: result.bid.id },
        data: { deviceFingerprint },
      }).catch(() => {})
    }

    // Referral — thưởng điểm 2 chiều khi người được mời đặt giá lần đầu (idempotent, no-op nếu không có)
    processFirstBidReferral(userId).catch(() => {})

    // Cache idempotency response (5 phút)
    const responsePayload = { success: true, data: result, message: 'Đặt giá thành công' }
    redisSet(idemCacheKey, JSON.stringify(responsePayload), 300)

    return apiSuccess(result, 'Đặt giá thành công')
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const bids = await getBidHistory(id, 30)
    return apiSuccess(bids)
  } catch (err) {
    return handleApiError(err)
  }
}
