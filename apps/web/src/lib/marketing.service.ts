import { randomBytes } from 'crypto'
import { prisma } from '@japanvip/db'
import { sendWelcomeEmail } from '@/lib/email.service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'

/** Lấy (hoặc tạo) token hủy đăng ký cho 1 user. */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { unsubscribeToken: true } })
  if (user?.unsubscribeToken) return user.unsubscribeToken
  const token = randomBytes(24).toString('hex')
  await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } })
  return token
}

export function buildUnsubscribeUrl(token: string): string {
  return `${APP_URL}/api/v1/email/unsubscribe?token=${token}`
}

/**
 * Gửi email chào mừng sau khi xác thực email.
 * Tôn trọng opt-out + chống gửi trùng (EmailLog). Fire-and-forget, không chặn flow.
 */
export async function triggerWelcomeEmail(email: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, marketingOptIn: true, profile: { select: { fullName: true } } },
    })
    if (!user || !user.marketingOptIn) return

    // Chống gửi trùng welcome
    const already = await prisma.emailLog.findFirst({ where: { email: user.email, type: 'welcome' }, select: { id: true } })
    if (already) return

    const token = await ensureUnsubscribeToken(user.id)
    await sendWelcomeEmail({
      email: user.email,
      fullName: user.profile?.fullName || 'bạn',
      unsubscribeUrl: buildUnsubscribeUrl(token),
    })

    await prisma.emailLog.create({ data: { email: user.email, type: 'welcome', userId: user.id } })
  } catch (err) {
    console.error('triggerWelcomeEmail failed:', err)
  }
}
