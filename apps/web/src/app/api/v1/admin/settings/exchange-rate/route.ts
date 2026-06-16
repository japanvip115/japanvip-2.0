import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { setExchangeRate, getActiveExchangeRate } from '@/modules/bfj/services/exchange-rate.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  from: z.string().length(3).default('JPY'),
  to: z.string().length(3).default('VND'),
  rate: z.number().positive(),
})

export async function GET() {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const rate = await getActiveExchangeRate()
    return apiSuccess(rate)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = schema.parse(await req.json())
    await setExchangeRate(body.from, body.to, body.rate, session.user!.id)
    return apiSuccess(null, `Tỷ giá ${body.from}/${body.to} = ${body.rate} đã được cập nhật`)
  } catch (err) {
    return handleApiError(err)
  }
}
