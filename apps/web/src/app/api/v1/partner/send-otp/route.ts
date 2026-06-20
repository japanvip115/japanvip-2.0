import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { createAndSendOtp } from '@/lib/otp.service'

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(2).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(req, 'affiliate-otp')
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau.', 429)

  try {
    const { email, name } = schema.parse(await req.json())
    await createAndSendOtp(email, 'affiliate_register', name)
    return apiSuccess({ email }, 'Mã OTP đã được gửi đến email của bạn.')
  } catch (err) {
    return handleApiError(err)
  }
}
