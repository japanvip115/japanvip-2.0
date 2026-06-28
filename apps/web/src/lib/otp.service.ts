import { randomInt } from 'crypto'
import { prisma } from '@japanvip/db'
import { sendOtpEmail } from './email.service'

const OTP_TTL_MINUTES = 10
const MAX_ACTIVE_OTPS = 3

export function generateOtpCode(): string {
  // crypto.randomInt → mã 6 số ngẫu nhiên an toàn (không dùng Math.random đoán được)
  return String(randomInt(100000, 1000000))
}

export async function createAndSendOtp(email: string, purpose: 'verify_email' | 'reset_password' | 'quick_order' | 'affiliate_register', fullName?: string) {
  // Invalidate recent unused OTPs for same email + purpose to avoid spam
  const recent = await prisma.emailOtp.count({
    where: {
      email,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (recent >= MAX_ACTIVE_OTPS) {
    throw new Error('Quá nhiều mã OTP đang chờ. Vui lòng đợi vài phút rồi thử lại.')
  }

  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

  await prisma.emailOtp.create({ data: { email, code, purpose, expiresAt } })
  await sendOtpEmail(email, code, fullName)
}

export async function verifyOtp(email: string, code: string, purpose: 'verify_email' | 'reset_password' | 'quick_order' | 'affiliate_register'): Promise<boolean> {
  // Atomic: chỉ đánh dấu usedAt nếu mã còn hợp lệ & chưa dùng → chống đua dùng lại 1 OTP 2 lần.
  const res = await prisma.emailOtp.updateMany({
    where: {
      email,
      code,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  })
  return res.count > 0
}
