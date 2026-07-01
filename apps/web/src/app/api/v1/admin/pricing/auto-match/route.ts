import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { fetchSourcePrice } from '@/lib/pricing/source-price'
import { matchUrl, norm, mapLimit } from '@/lib/pricing/match'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36' }
const PRICE_FETCH_CAP = 40 // lấy giá/lần cho 60s Vercel; phần dư để cron lo

// Đăng ký nguồn: shopnoidianhat = MỐC (isPrimary), 4 site còn lại = tham khảo (trung vị thị trường)
const SOURCES = [
  { source: 'shopnoidianhat', isPrimary: true, sitemap: 'https://shopnoidianhat.vn/sitemap_products_1.xml' },
  { source: 'hiephongjapan', isPrimary: false, sitemap: 'https://hiephongjapan.vn/sitemap_products_1.xml' },
  { source: 'hangnhat123', isPrimary: false, sitemap: 'https://www.hangnhat123.com/product-sitemap.xml' },
  { source: 'congnghenhat', isPrimary: false, sitemap: 'https://congnghenhat.com/product-sitemap.xml' },
  { source: 'phongcachnhat', isPrimary: false, sitemap: 'https://phongcachnhat.vn/product-sitemap.xml' },
]

async function loadCatalog(sitemapUrl: string): Promise<{ url: string; norm: string }[]> {
  try {
    const xml = await fetch(sitemapUrl, { headers: UA, signal: AbortSignal.timeout(20_000) }).then((r) => r.text())
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((m) => m[1]!.trim())
      .filter((u) => /^https?:\/\//.test(u) && !u.toLowerCase().endsWith('.xml'))
      .map((url) => ({ url, norm: norm(url.replace(/\/$/, '').split('/').pop() ?? '') }))
  } catch {
    return []
  }
}

// Tự khớp SP JapanVip ↔ 5 nguồn theo model (qua sitemap) → tạo link + lấy giá. Không dán tay.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const [products, existing, catalogs] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true } }),
      prisma.competitorPrice.findMany({ select: { productId: true, source: true } }),
      Promise.all(SOURCES.map((s) => loadCatalog(s.sitemap))),
    ])
    const linkedKey = new Set(existing.map((e) => e.productId + '|' + e.source))

    // Khớp (in-memory) → danh sách cần upsert
    const perSource: Record<string, number> = {}
    const matches: { id: string; source: string; url: string; isPrimary: boolean }[] = []
    SOURCES.forEach((src, i) => {
      perSource[src.source] = 0
      const catalog = catalogs[i]!
      if (!catalog.length) return
      for (const p of products) {
        if (linkedKey.has(p.id + '|' + src.source)) continue
        const url = matchUrl(p.name, catalog)
        if (!url) continue
        perSource[src.source] = (perSource[src.source] ?? 0) + 1
        matches.push({ id: p.id, source: src.source, url, isPrimary: src.isPrimary })
      }
    })

    // Tạo link (song song, giới hạn 8)
    await mapLimit(matches, 8, (m) =>
      prisma.competitorPrice.upsert({
        where: { productId_source: { productId: m.id, source: m.source } },
        update: { url: m.url, isPrimary: m.isPrimary, market: 'vn' },
        create: { productId: m.id, source: m.source, url: m.url, isPrimary: m.isPrimary, market: 'vn' },
      }),
    )

    // Lấy giá: ưu tiên mốc shopnoidianhat trước, song song 5 luồng, cap để không quá 60s
    const ordered = [...matches].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).slice(0, PRICE_FETCH_CAP)
    let priced = 0
    await mapLimit(ordered, 5, async (m) => {
      try {
        const f = await fetchSourcePrice(m.url)
        if (f.price == null) {
          await prisma.competitorPrice.update({ where: { productId_source: { productId: m.id, source: m.source } }, data: { fetchStatus: 'error', fetchedAt: new Date(), competitorName: f.name || null } })
          return
        }
        await prisma.competitorPrice.update({
          where: { productId_source: { productId: m.id, source: m.source } },
          data: { priceVnd: f.price, competitorName: f.name || null, fetchStatus: 'ok', fetchedAt: new Date() },
        })
        await prisma.competitorPriceHistory.create({ data: { productId: m.id, source: m.source, priceVnd: f.price } })
        priced++
      } catch { /* bỏ qua SP lỗi */ }
    })

    return apiSuccess(
      { totalProducts: products.length, matched: matches.length, priced, pending: Math.max(0, matches.length - priced), perSource },
      `Khớp ${matches.length} link (${Object.entries(perSource).map(([s, n]) => `${s}:${n}`).join(', ')}) · lấy giá ${priced}`,
    )
  } catch (err) {
    return handleApiError(err)
  }
}
