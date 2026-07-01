import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { fetchSourcePrice } from '@/lib/pricing/source-price'
import { jpyToVnd } from '@/lib/pricing/competitive'

const schema = z.object({
  productId: z.string().uuid(),
  source: z.string().min(1).max(50),
  url: z.string().url(),
})

async function guard() {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

async function jpyVndRate(): Promise<number | null> {
  const r = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'VND', isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  return r ? Number(r.rate) : null
}

// Dán/refresh 1 link nguồn giá cho SP → lấy giá → upsert CompetitorPrice.
export async function POST(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  try {
    const body = schema.parse(await req.json())
    const isJapan = body.source === 'kakaku'
    const isPrimary = body.source === 'shopnoidianhat'

    const fetched = await fetchSourcePrice(body.url)
    if (fetched.price == null) {
      return apiError('Không lấy được giá từ trang (trang chặn bot hoặc không có giá công khai). Nhập tay nếu cần.', 422)
    }

    let priceVnd: number | null = null
    let priceJpy: number | null = null
    if (isJapan) {
      priceJpy = fetched.price
      const rate = await jpyVndRate()
      priceVnd = rate ? jpyToVnd(priceJpy, rate) : null
    } else {
      priceVnd = fetched.price
    }

    const row = await prisma.competitorPrice.upsert({
      where: { productId_source: { productId: body.productId, source: body.source } },
      update: {
        url: body.url,
        competitorName: fetched.name || null,
        priceVnd,
        priceJpy,
        market: isJapan ? 'jp' : 'vn',
        isPrimary,
        fetchStatus: 'ok',
        fetchedAt: new Date(),
      },
      create: {
        productId: body.productId,
        source: body.source,
        market: isJapan ? 'jp' : 'vn',
        isPrimary,
        url: body.url,
        competitorName: fetched.name || null,
        priceVnd,
        priceJpy,
        fetchStatus: 'ok',
        fetchedAt: new Date(),
      },
    })

    return apiSuccess(row, 'Đã lấy giá')
  } catch (err) {
    return handleApiError(err)
  }
}
