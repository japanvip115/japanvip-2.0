import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { suggestPrice, priceFlags, importMarkupPct, median } from '@/lib/pricing/competitive'

async function guard() {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)
  return null
}

const num = (v: unknown): number | null => (v == null ? null : Number(v))

// Danh sách SP + giá nguồn + giá đề xuất + cờ cảnh báo.
export async function GET(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  try {
    const sp = req.nextUrl.searchParams
    const q = sp.get('q')?.trim()
    const flaggedOnly = sp.get('flaggedOnly') === '1'
    const limit = Math.min(Number(sp.get('limit')) || 100, 200)
    const offset = Number(sp.get('offset')) || 0

    const products = await prisma.product.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      select: {
        id: true,
        name: true,
        salePrice: true,
        costPrice: true,
        competitorPrices: {
          select: { source: true, market: true, isPrimary: true, url: true, priceVnd: true, priceJpy: true, fetchedAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // Giá Nhật THẤP NHẤT trong lịch sử (đáy ≈ giá VN nhập thực) — tránh so nhầm lúc giá đỉnh
    const lows = await prisma.competitorPriceHistory.groupBy({
      by: ['productId'],
      where: { source: 'rakuten', productId: { in: products.map((p) => p.id) }, priceVnd: { not: null } },
      _min: { priceVnd: true },
    })
    const lowMap = new Map(lows.map((l) => [l.productId, l._min.priceVnd != null ? Number(l._min.priceVnd) : null]))

    const rows = products.map((p) => {
      const yourPrice = num(p.salePrice)
      const anchorRow = p.competitorPrices.find((c) => c.isPrimary) ?? null
      const anchor = num(anchorRow?.priceVnd)
      const kakakuRow = p.competitorPrices.find((c) => c.source === 'rakuten') ?? p.competitorPrices.find((c) => c.market === 'jp') ?? null
      const japanVnd = num(kakakuRow?.priceVnd)
      const japanLowVnd = lowMap.get(p.id) ?? japanVnd
      const refPrices = p.competitorPrices
        .filter((c) => c.market === 'vn' && !c.isPrimary && c.priceVnd != null)
        .map((c) => Number(c.priceVnd))
      const refMedian = refPrices.length >= 2 ? median(refPrices) : null

      const suggested = anchor != null ? suggestPrice(anchor) : null
      const flags = priceFlags({ yourPrice, anchorVnd: anchor, refMedianVnd: refMedian })

      return {
        id: p.id,
        name: p.name,
        yourPrice,
        anchor,
        anchorUrl: anchorRow?.url ?? null,
        suggested,
        diffFromAnchor: anchor != null && yourPrice != null ? yourPrice - anchor : null,
        japanVnd,
        japanLowVnd,
        japanJpy: num(kakakuRow?.priceJpy),
        importMarkupPct: japanLowVnd != null && yourPrice != null ? importMarkupPct(yourPrice, japanLowVnd) : null,
        refMin: refPrices.length ? Math.min(...refPrices) : null,
        refMedian,
        refMax: refPrices.length ? Math.max(...refPrices) : null,
        refCount: refPrices.length,
        flags,
        sources: p.competitorPrices.map((c) => ({ source: c.source, url: c.url, priceVnd: num(c.priceVnd), fetchedAt: c.fetchedAt })),
      }
    })

    const filtered = flaggedOnly ? rows.filter((r) => r.flags.some((f) => f.level === 'red' || f.level === 'orange')) : rows

    return apiSuccess(filtered)
  } catch (err) {
    return handleApiError(err)
  }
}
