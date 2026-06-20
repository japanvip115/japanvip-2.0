import { prisma } from '@japanvip/db'
import { sendOtpEmail } from './email.service'

const OTP_TTL_MINUTES = 10
const MAX_ACTIVE_OTPS = 3

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
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
  const otp = await prisma.emailOtp.findFirst({
    where: {
      email,
      code,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return false

  await prisma.emailOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
  return true
}
