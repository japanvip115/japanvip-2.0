import { NextRequest } from 'next/server'
import { getActiveExchangeRate } from '@/modules/bfj/services/exchange-rate.service'
import { apiSuccess, handleApiError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? 'JPY'
  const to = searchParams.get('to') ?? 'VND'
  try {
    const data = await getActiveExchangeRate(from, to)
    return apiSuccess({ rate: data.rate, fromCurrency: data.fromCurrency, toCurrency: data.toCurrency })
  } catch (err) {
    return handleApiError(err)
  }
}
