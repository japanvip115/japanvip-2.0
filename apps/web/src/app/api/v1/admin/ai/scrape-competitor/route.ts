import { resolveEditorAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export type CompetitorProduct = {
  name: string
  brand: string
  price: number | null
  originalPrice: number | null
  description: string
  specs: Array<{ name: string; value: string }>
  images: string[]
  site: string
  url: string
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Connection': 'keep-alive',
}

// ── Tiki ─────────────────────────────────────────────────────────────────────
async function scrapeTiki(url: string): Promise<CompetitorProduct> {
  // Extract product ID from URL: tiki.vn/...-p{id}.html or tiki.vn/p{id}
  const idMatch = url.match(/[_-]p(\d+)\.html/) ?? url.match(/\/p(\d+)/)
  if (!idMatch) throw new Error('Không tìm được ID sản phẩm Tiki từ URL')

  const productId = idMatch[1]
  const apiUrl = `https://tiki.vn/api/v2/products/${productId}`
  const res = await fetch(apiUrl, {
    headers: { ...HEADERS, 'x-guest-token': '' },
  })
  if (!res.ok) throw new Error('Tiki API không trả về dữ liệu')

  const data = await res.json()

  const specs: Array<{ name: string; value: string }> = []
  for (const spec of (data.specifications ?? [])) {
    for (const attr of (spec.attributes ?? [])) {
      if (attr.name && attr.value) specs.push({ name: attr.name, value: String(attr.value) })
    }
  }

  const images: string[] = []
  for (const img of (data.images ?? [])) {
    const src = img.large_url ?? img.medium_url ?? img.base_url
    if (src) images.push(src)
  }

  return {
    name: data.name ?? '',
    brand: data.brand?.name ?? '',
    price: data.price ?? null,
    originalPrice: data.list_price ?? null,
    description: data.description ?? '',
    specs,
    images: images.slice(0, 10),
    site: 'tiki.vn',
    url,
  }
}

// ── Điện Máy Xanh ─────────────────────────────────────────────────────────────
async function scrapeDmx(url: string): Promise<CompetitorProduct> {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error('Không tải được trang Điện Máy Xanh')
  const html = await res.text()

  const name = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, '').trim()
    ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split('|')[0]?.trim()
    ?? ''

  // JSON-LD
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  let price: number | null = null
  let brand = ''
  const images: string[] = []

  for (const block of (jsonLdMatch ?? [])) {
    try {
      const json = JSON.parse(block.replace(/<\/?script[^>]*>/gi, ''))
      const prod = json['@type'] === 'Product' ? json : json['@graph']?.find((x: { '@type': string }) => x['@type'] === 'Product')
      if (prod) {
        price = prod.offers?.price ?? prod.offers?.[0]?.price ?? null
        brand = prod.brand?.name ?? ''
        const img = prod.image
        if (Array.isArray(img)) images.push(...img.slice(0, 8))
        else if (img) images.push(img)
      }
    } catch { /* ignore */ }
  }

  // Specs table
  const specs: Array<{ name: string; value: string }> = []
  const tableMatch = html.match(/<table[^>]*class="[^"]*parameter[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
    ?? html.match(/<ul[^>]*class="[^"]*parameter[^"]*"[^>]*>([\s\S]*?)<\/ul>/i)
  if (tableMatch?.[1]) {
    const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    for (const row of rows) {
      const cells = [...(row[1] ?? '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map(c => (c[1] ?? '').replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
      if (cells.length >= 2) specs.push({ name: cells[0]!, value: cells[1]! })
    }
  }

  return { name, brand, price, originalPrice: null, description: '', specs, images, site: 'dienmayxanh.com', url }
}

// ── MediaMart / Nguyễn Kim / generic VN sites ─────────────────────────────────
async function scrapeGenericVN(url: string): Promise<CompetitorProduct> {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Không tải được trang (${res.status})`)
  const html = await res.text()

  const hostname = new URL(url).hostname.replace('www.', '')

  // Name: try og:title, h1, <title>
  const name = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
    ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
    ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split(/[|\-–]/)[0]?.trim()
    ?? ''

  // Images — collect from all sources
  const rawImages: string[] = []

  // 1. og:image
  for (const m of html.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi))
    rawImages.push(m[1]!)

  // 2. JSON-LD Product images
  let price: number | null = null
  let brand = ''
  let description = ''
  const specs: Array<{ name: string; value: string }> = []

  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const block of jsonLdBlocks) {
    try {
      const json = JSON.parse(block[1]!)
      const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          if (!name && item.name) void 0
          brand = brand || item.brand?.name || ''
          description = description || item.description || ''
          price = price ?? item.offers?.price ?? item.offers?.[0]?.price ?? null
          const img = item.image
          if (Array.isArray(img)) rawImages.push(...img.slice(0, 6))
          else if (img && !rawImages.includes(img)) rawImages.push(img)
        }
      }
    } catch { /* ignore */ }
  }

  // Extract only alphanumeric model codes (must contain BOTH letters and digits, e.g. "wxc74x", "735l", "r-wxc74x")
  // Excludes common words like "lanh", "hitachi", "model", "hang"
  const modelCodes = (name || '')
    .split(/[\s\/]+/)
    .flatMap(w => w.split('-'))
    .filter(w => w.length >= 4 && /[a-zA-Z]/.test(w) && /[0-9]/.test(w))
    .map(w => w.toLowerCase())

  const isRelevant = (src: string) => {
    if (!modelCodes.length) return true
    const lower = src.toLowerCase()
    return modelCodes.some(k => lower.includes(k))
  }

  // 3. data-src from lazy-loaded images — only product-relevant ones (by keyword in URL)
  const baseOrigin = new URL(url).origin
  const SMALL_THUMB = /-(?:64|32|48|96|128|150|100)x\d+\./
  const dataSrcMatches = [...html.matchAll(/data-(?:src|lazy-src|original|lazy)=["']([^"']+\.(jpg|jpeg|png|webp))["']/gi)]
  for (const m of dataSrcMatches) {
    const src = m[1]!.startsWith('http') ? m[1]! : `${baseOrigin}${m[1]!.startsWith('/') ? '' : '/'}${m[1]!}`
    if (!SMALL_THUMB.test(src) && isRelevant(src)) rawImages.push(src)
  }

  // 4. <img src> absolute URLs — relevant only
  for (const m of html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp))["']/gi)) {
    if (!SMALL_THUMB.test(m[1]!) && !m[1]!.includes('base64') && isRelevant(m[1]!)) rawImages.push(m[1]!)
  }

  // Dedupe and validate
  const allImages = [...new Set(rawImages)]
    .filter(u => typeof u === 'string' && u.startsWith('http') && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))

  // Keywords that indicate non-product images (UI icons, banners, logos, unrelated items)
  const NOISE_PATTERNS = /zalo|facebook|chat|call|phone|whatsapp|logo|icon|banner|avatar|pizza|bep-tu|bep_tu|dieu-hoa|may-giat|may-rua|nuoc-nong|biểu-tượng|badge|best.?seller|thuonghieu|feature|flash/i

  const relevantImages = allImages.filter(u => isRelevant(u) && !NOISE_PATTERNS.test(u))
  const images = (relevantImages.length >= 2 ? relevantImages : allImages.filter(u => !NOISE_PATTERNS.test(u))).slice(0, 10)

  // Specs: look for common table / list patterns
  const specTableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi)
  if (specTableMatch) {
    for (const table of specTableMatch.slice(0, 5)) {
      const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      for (const row of rows) {
        const cells = [...(row[1] ?? '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
          .map(c => (c[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
        if (cells.length >= 2 && cells[0]!.length < 80) {
          specs.push({ name: cells[0]!, value: cells[1]! })
        }
      }
      if (specs.length >= 5) break
    }
  }

  // Description from meta
  if (!description) {
    description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ?? ''
  }

  return {
    name,
    brand,
    price,
    originalPrice: null,
    description,
    specs: specs.slice(0, 40),
    images: [...new Set(images)].slice(0, 10),
    site: hostname,
    url,
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
async function scrapeCompetitor(url: string): Promise<CompetitorProduct> {
  const hostname = new URL(url).hostname

  if (hostname.includes('tiki.vn')) return scrapeTiki(url)
  if (hostname.includes('dienmayxanh.com')) return scrapeDmx(url)
  // Shopee, Lazada, MediaMart, Nguyễn Kim, Bách Hóa Xanh, etc. → generic
  return scrapeGenericVN(url)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await req.json()
  if (!url?.startsWith('http')) {
    return Response.json({ success: false, message: 'URL không hợp lệ' }, { status: 400 })
  }

  try {
    const data = await scrapeCompetitor(url)
    if (!data.name) {
      return Response.json({ success: false, message: 'Không lấy được tên sản phẩm — trang có thể chặn bot' })
    }
    return Response.json({ success: true, data })
  } catch (err) {
    return Response.json({
      success: false,
      message: err instanceof Error ? err.message : 'Lỗi scrape',
    })
  }
}
