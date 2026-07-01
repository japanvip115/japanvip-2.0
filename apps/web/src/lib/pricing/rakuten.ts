// Lấy giá Nhật từ Rakuten Ichiba API (JSON, chạy server-side → Vercel/cron OK, không cần Chrome).
// Key ở env (RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_ORIGIN). Origin PHẢI khớp domain đăng ký app.

const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601'
// Bỏ phụ kiện/linh kiện/hàng tương thích để lấy đúng giá sản phẩm
const PART_RE = /パーツ|部品|ケース|フィルター|カバー|キバン|セイギヨ|センザイ|交換用|付属|ノズル|取っ手|レンズ|互換|用$/i

export async function fetchRakutenPrice(model: string): Promise<{ priceJpy: number; url: string; name: string } | null> {
  const appId = process.env.RAKUTEN_APP_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  const origin = process.env.RAKUTEN_ORIGIN || 'https://japanvip.vn'
  if (!appId || !accessKey) return null

  const url =
    `${ENDPOINT}?applicationId=${appId}&accessKey=${accessKey}` +
    `&keyword=${encodeURIComponent(model)}&hits=20&format=json&formatVersion=2&sort=standard&availability=1`
  try {
    const res = await fetch(url, { headers: { Origin: origin, 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const j = (await res.json()) as { Items?: { itemName?: string; itemPrice?: number; itemUrl?: string }[] }
    // SP thật đầu tiên (đã lọc phụ kiện) theo thứ tự liên quan của Rakuten = giá sát nhất
    const real = (j.Items ?? []).find((i) => i.itemPrice && i.itemPrice > 1000 && !PART_RE.test(i.itemName ?? ''))
    if (!real?.itemPrice) return null
    return { priceJpy: real.itemPrice, url: real.itemUrl ?? '', name: real.itemName ?? '' }
  } catch {
    return null
  }
}
