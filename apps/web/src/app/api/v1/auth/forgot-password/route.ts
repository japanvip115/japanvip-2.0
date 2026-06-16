import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { createAndSendOtp } from '@/lib/otp.service'

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'auth:forgot-password')
    if (!limited.allowed) return apiError('Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)

    const { email } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, profile: { select: { fullName: true } } },
    })

    // Always return success to prevent email enumeration
    if (!user || !user.emailVerified) {
      return apiSuccess(null, 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được mã trong vài phút.')
    }

    await createAndSendOtp(email, 'reset_password', user.profile?.fullName ?? undefined)

    return apiSuccess(null, 'Mã đặt lại mật khẩu đã được gửi vào email của bạn.')
  } catch (err) {
    return handleApiError(err)
  }
}
