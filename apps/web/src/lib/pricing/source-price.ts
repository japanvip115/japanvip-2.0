// Lấy TÊN + GIÁ một sản phẩm từ URL nguồn (shopnoidianhat, kakaku, ...) — tinh gọn.
// Ưu tiên JSON-LD Product (offers.price), fallback meta itemprop / "price": ...

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,ja;q=0.8,en;q=0.7',
}

export interface FetchedPrice {
  name: string
  price: number | null // số thô theo tiền tệ của trang nguồn (VNĐ hoặc ¥)
}

export async function fetchSourcePrice(url: string): Promise<FetchedPrice> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Không tải được trang (${res.status})`)
  const html = await res.text()

  const name =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split(/[|\-–]/)[0]?.trim() ??
    ''

  let price: number | null = null

  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const block of jsonLdBlocks) {
    try {
      const json = JSON.parse(block[1]!)
      const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const p =
            item.offers?.price ??
            item.offers?.[0]?.price ??
            item.offers?.lowPrice ??
            item.offers?.[0]?.lowPrice ??
            null
          if (p != null) {
            price = Number(p)
            break
          }
        }
      }
    } catch {
      /* ignore JSON lỗi */
    }
    if (price != null) break
  }

  if (price == null) {
    const m =
      html.match(/<meta[^>]+itemprop="price"[^>]+content="([\d.]+)"/i) ??
      html.match(/"price"\s*:\s*"?([\d.]+)"?/i)
    if (m) price = Number(m[1])
  }

  return { name: name || '', price: price != null && Number.isFinite(price) ? price : null }
}
