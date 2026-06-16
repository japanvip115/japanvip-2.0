import { prisma } from '@japanvip/db'
import { getCached, setCached, CacheKey, CACHE_TTL } from '@/lib/redis'

export type ExchangeRateData = {
  id: string
  rate: number
  fromCurrency: string
  toCurrency: string
}

export async function getActiveExchangeRate(
  from = 'JPY',
  to = 'VND'
): Promise<ExchangeRateData> {
  const cacheKey = CacheKey.exchangeRate(from, to)
  const cached = await getCached<ExchangeRateData>(cacheKey)
  if (cached) return cached

  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: from, toCurrency: to, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!rate) {
    // Fallback rate khi chưa có trong DB (chỉ dùng khi khởi động lần đầu)
    const fallback: ExchangeRateData = { id: 'fallback', rate: 170, fromCurrency: from, toCurrency: to }
    return fallback
  }

  const result: ExchangeRateData = {
    id: rate.id,
    rate: Number(rate.rate),
    fromCurrency: rate.fromCurrency,
    toCurrency: rate.toCurrency,
  }

  await setCached(cacheKey, result, CACHE_TTL.EXCHANGE_RATE)
  return result
}

export async function setExchangeRate(
  from: string,
  to: string,
  rate: number,
  adminId: string
): Promise<void> {
  // Deactivate all existing rates for this pair
  await prisma.exchangeRate.updateMany({
    where: { fromCurrency: from, toCurrency: to, isActive: true },
    data: { isActive: false },
  })

  await prisma.exchangeRate.create({
    data: {
      fromCurrency: from,
      toCurrency: to,
      rate,
      source: `admin:${adminId}`,
      isActive: true,
    },
  })

  // Invalidate cache
  const { invalidateCache } = await import('@/lib/redis')
  await invalidateCache(CacheKey.exchangeRate(from, to))
}
