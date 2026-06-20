import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'
import { getFraudSetting, isFraudRuleEnabled } from '@/lib/fraud-settings'
import { sendOtpEmail as _sendOtpEmail } from '@/lib/email.service'

function sendOtpEmail(opts: { email: string; fullName: string; otp: string; purpose: string }) {
  return _sendOtpEmail(opts.email, opts.otp, opts.fullName)
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Vui lòng đăng nhập.', 401)

  // CSRF: exact origin match
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || (origin !== `https://${host}` && process.env.NODE_ENV !== 'development')) {
    return apiError('Forbidden', 403)
  }

  if (!(await isFraudRuleEnabled('OTP_HIGH_VALUE'))) {
    return NextResponse.json({ success: false, error: 'OTP không được bật' }, { status: 400 })
  }

  const { id: auctionId } = await params
  const userId = session.user.id

  // Rate limit: 1 lần/60 giây
  const rl = await rateLimit(req, `bid-otp:${userId}:${auctionId}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Vui lòng chờ trước khi yêu cầu mã mới.' },
      { status: 429 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, profile: { select: { fullName: true } } },
  })
  if (!user?.email) return apiError('Không tìm thấy email tài khoản', 400)

  const body = await req.json().catch(() => ({}))
  const amount = Number(body.amount ?? 0)
  const threshold = parseInt(await getFraudSetting('BID_OTP_THRESHOLD'), 10) || 500_000_000
  if (amount < threshold) {
    return NextResponse.json({ success: false, error: 'Giá đặt chưa đến ngưỡng yêu cầu OTP' }, { status: 400 })
  }

  // Kiểm tra OTP cũ chưa dùng
  const existing = await prisma.bidConfirmOtp.findFirst({
    where: { userId, auctionId, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    // Cooldown 60s
    const secondsSinceLast = (Date.now() - existing.lastRequestedAt.getTime()) / 1000
    if (secondsSinceLast < 60) {
      return NextResponse.json(
        { success: false, error: `Vui lòng chờ ${Math.ceil(60 - secondsSinceLast)} giây trước khi yêu cầu mã mới.` },
        { status: 429 }
      )
    }
    // Giới hạn 5 lần request — atomic để chống race condition
    const bumped = await prisma.bidConfirmOtp.updateMany({
      where: { id: existing.id, requestCount: { lt: 5 } },
      data: { requestCount: { increment: 1 }, lastRequestedAt: new Date() },
    })
    if (bumped.count === 0) {
      await prisma.bidConfirmOtp.updateMany({ where: { id: existing.id, used: false }, data: { used: true } })
      return NextResponse.json({ success: false, error: 'Đã yêu cầu OTP quá nhiều lần. Vui lòng bắt đầu lại.' }, { status: 429 })
    }
  } else {
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    await prisma.bidConfirmOtp.create({
      data: {
        userId,
        auctionId,
        amount,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    // Gửi email OTP
    await sendOtpEmail({
      email: user.email,
      fullName: user.profile?.fullName ?? 'Khách hàng',
      otp,
      purpose: 'bid_confirm',
    }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    message: `Mã OTP đã được gửi đến ${user.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
  })
}
