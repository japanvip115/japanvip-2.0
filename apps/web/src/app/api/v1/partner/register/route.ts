import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { verifyOtp } from '@/lib/otp.service'

const schema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(9).max(15),
  bankName: z.string().min(2).max(100),
  bankAccount: z.string().min(6).max(30),
  bankHolder: z.string().min(2).max(100),
  refCode: z.string().min(3).max(20).regex(/^[A-Z0-9_]+$/i, 'Chỉ dùng chữ hoa, số và _'),
  email: z.string().email(),
  otp: z.string().length(6),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })

  try {
    const body = schema.parse(await req.json())
    const refCode = body.refCode.toUpperCase()

    // Verify OTP
    const otpValid = await verifyOtp(body.email.toLowerCase(), body.otp, 'affiliate_register')
    if (!otpValid) return NextResponse.json({ success: false, error: 'Mã OTP không đúng hoặc đã hết hạn' }, { status: 400 })

    // Check exists
    const existing = await prisma.partnerProfile.findUnique({ where: { userId: session.user.id } })
    if (existing) return NextResponse.json({ success: false, error: 'Bạn đã đăng ký rồi' }, { status: 400 })

    // Check refCode unique
    const refExists = await prisma.partnerProfile.findUnique({ where: { refCode } })
    if (refExists) return NextResponse.json({ success: false, error: 'Mã giới thiệu đã có người dùng, vui lòng chọn mã khác' }, { status: 400 })

    await prisma.$transaction([
      prisma.partnerProfile.create({
        data: {
          userId: session.user.id,
          refCode,
          bankName: body.bankName,
          bankAccount: body.bankAccount,
          bankHolder: body.bankHolder,
          status: 'PENDING',
        },
      }),
      prisma.userProfile.upsert({
        where: { userId: session.user.id },
        update: { fullName: body.fullName },
        create: { userId: session.user.id, fullName: body.fullName },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}
