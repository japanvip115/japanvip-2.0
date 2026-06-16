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
    const limited = await rateLimit(req, 'auth:resend-otp')
    if (!limited.allowed) return apiError('Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)

    const { email } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true, profile: { select: { fullName: true } } },
    })

    if (!user) return apiError('Email không tồn tại trong hệ thống.', 404)
    if (user.emailVerified) return apiError('Email này đã được xác thực rồi.', 400)

    await createAndSendOtp(email, 'verify_email', user.profile?.fullName ?? undefined)
    return apiSuccess(null, 'Mã xác thực mới đã được gửi vào email của bạn.')
  } catch (err) {
    return handleApiError(err)
  }
}
