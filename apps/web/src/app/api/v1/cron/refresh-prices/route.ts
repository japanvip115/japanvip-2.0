import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { fetchSourcePrice } from '@/lib/pricing/source-price'
import { jpyToVnd, priceFlags, median } from '@/lib/pricing/competitive'
import { mapLimit } from '@/lib/pricing/match'
import { sendPriceAlertEmail } from '@/lib/email.service'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const num = (v: unknown): number | null => (v == null ? null : Number(v))

async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.siteSetting.findUnique({ where: { key } })
  return s?.value ?? null
}

// Cào lại giá tất cả link đã lưu → cập nhật CompetitorPrice + ghi lịch sử → email cảnh báo lệch dải.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.competitorPrice.findMany({
    where: { url: { not: null } },
    orderBy: { fetchedAt: { sort: 'asc', nulls: 'first' } },
    take: 150,
  })

  const rate = await prisma.exchangeRate
    .findFirst({ where: { fromCurrency: 'JPY', toCurrency: 'VND', isActive: true }, orderBy: { updatedAt: 'desc' } })
    .then((r) => (r ? Number(r.rate) : null))

  let updated = 0
  let failed = 0

  // Cào song song 5 luồng (row cũ nhất/chưa có giá trước) → cập nhật giá + ghi lịch sử
  await mapLimit(rows, 5, async (row) => {
    try {
      const fetched = await fetchSourcePrice(row.url!)
      if (fetched.price == null) {
        await prisma.competitorPrice.update({ where: { id: row.id }, data: { fetchStatus: 'error', fetchedAt: new Date() } })
        failed++
        return
      }
      const isJp = row.market === 'jp'
      const priceJpy = isJp ? fetched.price : null
      const priceVnd = isJp ? (rate ? jpyToVnd(fetched.price, rate) : null) : fetched.price

      await prisma.competitorPrice.update({
        where: { id: row.id },
        data: { priceVnd, priceJpy, fetchStatus: 'ok', fetchedAt: new Date() },
      })
      if (priceVnd != null) {
        await prisma.competitorPriceHistory.create({
          data: { productId: row.productId, source: row.source, priceVnd },
        })
      }
      updated++
    } catch {
      await prisma.competitorPrice.update({ where: { id: row.id }, data: { fetchStatus: 'error', fetchedAt: new Date() } }).catch(() => {})
      failed++
    }
  })

  // Tính cờ lệch dải → gom SP cần cảnh báo
  const productIds = [...new Set(rows.map((r) => r.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, salePrice: true, competitorPrices: { select: { source: true, market: true, isPrimary: true, priceVnd: true } } },
  })

  const alerts: Array<{ name: string; yourPrice: number | null; anchor: number | null; message: string }> = []
  for (const p of products) {
    const anchor = num(p.competitorPrices.find((c) => c.isPrimary)?.priceVnd)
    const refs = p.competitorPrices.filter((c) => c.market === 'vn' && !c.isPrimary && c.priceVnd != null).map((c) => Number(c.priceVnd))
    const flags = priceFlags({ yourPrice: num(p.salePrice), anchorVnd: anchor, refMedianVnd: refs.length >= 2 ? median(refs) : null })
    const hit = flags.find((f) => f.level === 'red' || f.level === 'orange')
    if (hit) alerts.push({ name: p.name, yourPrice: num(p.salePrice), anchor, message: hit.message })
  }

  let emailed = false
  if (alerts.length && (await getSetting('pricing_alert_enabled')) !== '0') {
    const to = (await getSetting('pricing_alert_email')) || 'admin@japanvip.vn'
    try {
      await sendPriceAlertEmail({ to, items: alerts })
      emailed = true
    } catch { /* email lỗi không chặn cron */ }
  }

  return Response.json({ ok: true, total: rows.length, updated, failed, alerts: alerts.length, emailed })
}
