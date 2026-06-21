import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { verifyOtp } from '@/lib/otp.service'
import { triggerWelcomeEmail } from '@/lib/marketing.service'

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'auth:verify-email')
    if (!limited.allowed) return apiError('Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)

    const body = await req.json()
    const { email, code } = schema.parse(body)

    const valid = await verifyOtp(email, code, 'verify_email')
    if (!valid) return apiError('Mã xác thực không đúng hoặc đã hết hạn.', 400)

    await prisma.user.update({
      where: { email },
      data: { emailVerified: true, status: 'ACTIVE' },
    })

    // Gửi email chào mừng (fire-and-forget, không chặn response)
    triggerWelcomeEmail(email).catch(() => {})

    return apiSuccess({ email }, 'Email đã được xác thực thành công. Bạn có thể đăng nhập.')
  } catch (err) {
    return handleApiError(err)
  }
}
