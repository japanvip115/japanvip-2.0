import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import bcrypt from 'bcryptjs'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { verifyOtp } from '@/lib/otp.service'

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().length(6).regex(/^\d{6}$/),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 'auth:reset-password')
    if (!limited.allowed) return apiError('Quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)

    const { email, code, password } = schema.parse(await req.json())

    const valid = await verifyOtp(email, code, 'reset_password')
    if (!valid) return apiError('Mã xác thực không đúng hoặc đã hết hạn.', 400)

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    })

    return apiSuccess(null, 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập.')
  } catch (err) {
    return handleApiError(err)
  }
}
