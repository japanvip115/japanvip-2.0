import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { extractModels } from '@/lib/pricing/match'
import { jpyToVnd } from '@/lib/pricing/competitive'
import { fetchKakakuByModel } from '@/lib/pricing/kakaku'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const CAP = 12 // Playwright chậm → cào tối đa 12 SP/lần; bấm lại để cào tiếp

// Cào giá Nhật (kakaku) qua Playwright — CHỈ chạy LOCAL (Vercel không có Chrome → 503).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  let chromium: { launch: (o: unknown) => Promise<unknown> }
  try {
    ;({ chromium } = (await import('playwright-core')) as unknown as { chromium: typeof chromium })
  } catch {
    return apiError('Cần Playwright — cào giá Nhật chỉ chạy khi bật dev LOCAL.', 503)
  }
  let browser: { newPage: () => Promise<any>; close: () => Promise<void> }
  try {
    browser = (await chromium.launch({ channel: 'chrome', headless: true })) as typeof browser
  } catch {
    return apiError('Không mở được Chrome — cào giá Nhật chỉ chạy LOCAL (Vercel không có Chrome).', 503)
  }

  try {
    const rate = await prisma.exchangeRate
      .findFirst({ where: { fromCurrency: 'JPY', toCurrency: 'VND', isActive: true }, orderBy: { updatedAt: 'desc' } })
      .then((r) => (r ? Number(r.rate) : null))
    const linked = new Set((await prisma.competitorPrice.findMany({ where: { source: 'kakaku' }, select: { productId: true } })).map((e) => e.productId))
    const products = (await prisma.product.findMany({ select: { id: true, name: true } })).filter((p) => !linked.has(p.id))

    const page = await browser.newPage()
    let priced = 0
    let tried = 0
    for (const p of products) {
      if (tried >= CAP) break
      const model = extractModels(p.name)[0]
      if (!model) continue
      tried++
      const r = await fetchKakakuByModel(page, model)
      if (!r) continue
      const priceVnd = rate ? jpyToVnd(r.priceJpy, rate) : null
      await prisma.competitorPrice.upsert({
        where: { productId_source: { productId: p.id, source: 'kakaku' } },
        update: { url: r.itemUrl, market: 'jp', priceJpy: r.priceJpy, priceVnd, fetchStatus: 'ok', fetchedAt: new Date() },
        create: { productId: p.id, source: 'kakaku', market: 'jp', url: r.itemUrl, priceJpy: r.priceJpy, priceVnd, fetchStatus: 'ok', fetchedAt: new Date() },
      })
      if (priceVnd != null) await prisma.competitorPriceHistory.create({ data: { productId: p.id, source: 'kakaku', priceVnd } })
      priced++
    }
    await browser.close()
    return apiSuccess({ tried, priced, remaining: Math.max(0, products.length - tried) }, `Cào giá Nhật ${priced}/${tried} SP (còn ${Math.max(0, products.length - tried)})`)
  } catch (err) {
    await browser.close().catch(() => {})
    return handleApiError(err)
  }
}
