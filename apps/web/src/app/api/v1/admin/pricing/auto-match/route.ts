import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { fetchSourcePrice } from '@/lib/pricing/source-price'
import { matchUrl, norm } from '@/lib/pricing/match'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const SITEMAP = 'https://shopnoidianhat.vn/sitemap_products_1.xml'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36' }
const PRICE_FETCH_CAP = 25 // giới hạn lấy giá/lần để không quá 60s Vercel; phần còn lại cron 6h sáng lo

// Tự khớp SP JapanVip ↔ shopnoidianhat theo model (qua sitemap) → tạo link + lấy giá. Không dán tay.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    // 1. Tải sitemap → catalog { url, norm(slug) }
    const xml = await fetch(SITEMAP, { headers: UA, signal: AbortSignal.timeout(20_000) }).then((r) => r.text())
    const catalog = [...xml.matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/gi)].map((m) => {
      const url = m[1]!.trim()
      const slug = url.split('/products/')[1] ?? ''
      return { url, norm: norm(slug) }
    })
    if (!catalog.length) return apiError('Không đọc được sitemap shopnoidianhat', 502)

    // 2. SP chưa có link shopnoidianhat (giữ nguyên link đã có/dán tay)
    const linked = new Set((await prisma.competitorPrice.findMany({ where: { source: 'shopnoidianhat' }, select: { productId: true } })).map((e) => e.productId))
    const products = await prisma.product.findMany({ select: { id: true, name: true } })
    const toMatch = products.filter((p) => !linked.has(p.id))

    // 3. Khớp + tạo link (chưa giá)
    const matched: { id: string; url: string }[] = []
    for (const p of toMatch) {
      const url = matchUrl(p.name, catalog)
      if (!url) continue
      await prisma.competitorPrice.upsert({
        where: { productId_source: { productId: p.id, source: 'shopnoidianhat' } },
        update: { url, isPrimary: true, market: 'vn' },
        create: { productId: p.id, source: 'shopnoidianhat', url, isPrimary: true, market: 'vn' },
      })
      matched.push({ id: p.id, url })
    }

    // 4. Lấy giá cho lô đầu (phần dư để cron)
    let priced = 0
    for (const m of matched.slice(0, PRICE_FETCH_CAP)) {
      try {
        const f = await fetchSourcePrice(m.url)
        if (f.price == null) {
          await prisma.competitorPrice.update({ where: { productId_source: { productId: m.id, source: 'shopnoidianhat' } }, data: { fetchStatus: 'error', fetchedAt: new Date(), competitorName: f.name || null } })
          continue
        }
        await prisma.competitorPrice.update({
          where: { productId_source: { productId: m.id, source: 'shopnoidianhat' } },
          data: { priceVnd: f.price, competitorName: f.name || null, fetchStatus: 'ok', fetchedAt: new Date() },
        })
        await prisma.competitorPriceHistory.create({ data: { productId: m.id, source: 'shopnoidianhat', priceVnd: f.price } })
        priced++
      } catch { /* bỏ qua SP lỗi */ }
    }

    return apiSuccess({
      totalProducts: products.length,
      alreadyLinked: linked.size,
      matched: matched.length,
      priced,
      pending: Math.max(0, matched.length - priced),
      unmatched: toMatch.length - matched.length,
    }, `Đã khớp ${matched.length} SP, lấy giá ${priced}`)
  } catch (err) {
    return handleApiError(err)
  }
}
