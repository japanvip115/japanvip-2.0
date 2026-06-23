import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import bcrypt from 'bcryptjs'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { createAndSendOtp } from '@/lib/otp.service'
import { applyReferralCode } from '@/lib/referral.service'

const schema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().max(20).trim().optional(),
  password: z.string().min(8).max(128),
  referralCode: z.string().max(20).trim().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'auth:register')
    if (!limited.allowed) return apiError('Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)

    const body = await req.json()
    const { fullName, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } })
    if (existing) {
      if (existing.emailVerified) return apiError('Email này đã được sử dụng. Vui lòng đăng nhập.', 409)
      // Unverified account — resend OTP
      await createAndSendOtp(email, 'verify_email', fullName)
      return apiSuccess({ email, requiresVerification: true }, 'Mã xác thực đã được gửi lại vào email của bạn.')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        passwordHash,
        role: 'CUSTOMER',
        status: 'PENDING_VERIFY',
        emailVerified: false,
        profile: {
          create: { fullName },
        },
      },
      select: { id: true },
    })

    // Gắn quan hệ giới thiệu nếu có mã (âm thầm bỏ qua nếu mã sai)
    if (referralCode) {
      await applyReferralCode(newUser.id, referralCode).catch(() => {})
    }

    await createAndSendOtp(email, 'verify_email', fullName)

    return apiSuccess({ email, requiresVerification: true }, 'Mã xác thực đã được gửi vào email của bạn.', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
