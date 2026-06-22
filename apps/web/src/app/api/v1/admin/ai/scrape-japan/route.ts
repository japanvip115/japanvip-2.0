import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'

export const maxDuration = 30

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function isSafeUrl(raw: string): boolean {
  try {
    const p = new URL(raw)
    if (!['http:', 'https:'].includes(p.protocol)) return false
    const h = p.hostname.toLowerCase()
    return !/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(h)
  } catch { return false }
}

function resolveUrl(src: string, base: URL): string {
  if (!src) return ''
  if (src.startsWith('http')) return src
  if (src.startsWith('//')) return base.protocol + src
  if (src.startsWith('/')) return `${base.protocol}//${base.host}${src}`
  return ''
}

// ── Amazon.co.jp ──────────────────────────────────────────────────────────────
async function scrapeAmazonJP(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const base = new URL(url)

  // Tên sản phẩm
  const name =
    $('#productTitle').first().text().trim() ||
    $('h1#title span').first().text().trim() ||
    $('h1.a-size-large').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') || ''

  // 🔒 LOCKED (2026-06) — Lấy giá đúng biến thể + bắt công suất/điện áp. Xem CLAUDE.md. KHÔNG tự sửa.
  // Giá — ưu tiên giá biến thể đang chọn (buybox/core), fallback sang "from ¥..." trong buying options
  const priceCandidates = [
    $('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen').first().text(),
    $('#corePrice_feature_div .a-price .a-offscreen').first().text(),
    $('#apex_desktop .a-price .a-offscreen').first().text(),
    $('#buybox .a-price .a-offscreen').first().text(),
    $('.a-price .a-offscreen').first().text(),
    $('#priceblock_ourprice').first().text(),
    $('#priceblock_dealprice').first().text(),
    // "from ¥..." ở vùng tùy chọn mua (khi không có featured offer)
    $('#unifiedPrice_feature_div .a-price .a-offscreen').first().text(),
    $('.swatchAvailable .a-price .a-offscreen').first().text(),
    $('.a-price-whole').first().text(),
  ]
  const parsePrice = (t: string): number | null => {
    const n = parseInt((t || '').replace(/[^0-9]/g, ''), 10)
    return n && n >= 1000 && n <= 5_000_000 ? n : null
  }
  let priceJPY = priceCandidates.map(parsePrice).find((n): n is number => n !== null) ?? null
  // Last resort: tìm "¥xx,xxx" đầu tiên trong vùng giá nếu các selector trên trượt
  if (!priceJPY) {
    const m = html.match(/[¥￥]\s?([0-9]{1,3}(?:,[0-9]{3})+)/)
    if (m) priceJPY = parsePrice(m[1]!)
  }

  // Model / ASIN
  const asin = url.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? ''
  let model = ''
  // Tìm model trong tech specs table
  $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').each((_, tr) => {
    const label = $(tr).find('th').text().trim()
    const val = $(tr).find('td').text().trim()
    if (/モデル番号|型番|ASIN/i.test(label) && !model) model = val
  })
  if (!model && asin) model = asin

  // Thông số kỹ thuật — Amazon có nhiều bảng
  const specs: Array<{ name: string; value: string }> = []
  const seen = new Set<string>()

  // Tech spec table
  $('#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr').each((_, tr) => {
    const key = $(tr).find('th').text().replace(/\s+/g, ' ').trim()
    const val = $(tr).find('td').text().replace(/\s+/g, ' ').trim()
    if (key && val && !seen.has(key)) { seen.add(key); specs.push({ name: key, value: val }) }
  })

  // Detail bullets (dạng list)
  $('#detailBullets_feature_div li').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    const parts = text.split(/\s*:\s*/)
    if (parts.length >= 2) {
      const key = parts[0]?.trim() ?? ''
      const val = parts.slice(1).join(': ').trim()
      if (key && val && !seen.has(key)) { seen.add(key); specs.push({ name: key, value: val }) }
    }
  })

  // Product overview bullets
  $('#productOverview_feature_div tr').each((_, tr) => {
    const key = $(tr).find('td:first-child').text().replace(/\s+/g, ' ').trim()
    const val = $(tr).find('td:last-child').text().replace(/\s+/g, ' ').trim()
    if (key && val && !seen.has(key)) { seen.add(key); specs.push({ name: key, value: val }) }
  })

  // Mọi bảng key-value của Amazon ("Product information" / 商品の情報) — chứa ワット数, 電圧,
  // 定格消費電力, 周波数, Wattage, Voltage... (nguồn công suất + điện áp)
  $('table.a-keyvalue tr, table.prodDetTable tr').each((_, tr) => {
    const $tr = $(tr)
    const key = ($tr.find('th').first().text() || $tr.find('td').first().text()).replace(/\s+/g, ' ').trim()
    const tds = $tr.find('td')
    const val = (tds.length > 1 ? tds.last() : tds.first()).text().replace(/\s+/g, ' ').trim()
    if (key && val && key !== val && !seen.has(key)) { seen.add(key); specs.push({ name: key, value: val }) }
  })

  // Ảnh sản phẩm — Amazon dùng JS để load ảnh, lấy từ data JSON trong script
  const images: string[] = []

  // Tìm trong script block có colorImages / imageGalleryData
  $('script').each((_, el) => {
    const src = $(el).html() ?? ''
    // Pattern: "hiRes":"https://..."
    const hiResMatches = src.matchAll(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/g)
    for (const m of hiResMatches) {
      const u = m[1]
      if (u && !images.includes(u)) images.push(u)
    }
    // Pattern: "large":"https://..."
    if (images.length === 0) {
      const largeMatches = src.matchAll(/"large"\s*:\s*"(https:\/\/[^"]+)"/g)
      for (const m of largeMatches) {
        const u = m[1]
        if (u && !images.includes(u) && !u.includes('gif')) images.push(u)
      }
    }
  })

  // Fallback: img tags in gallery
  if (images.length === 0) {
    $('#imgBlkFront, #landingImage, #main-image, .imgTagWrapper img').each((_, el) => {
      const src = $(el).attr('data-old-hires') || $(el).attr('data-a-hires') || $(el).attr('src') || ''
      const r = resolveUrl(src, base)
      if (r && !images.includes(r)) images.push(r)
    })
  }

  // OG image fallback
  const ogImg = $('meta[property="og:image"]').attr('content') ?? ''
  if (ogImg && !images.includes(ogImg)) images.push(resolveUrl(ogImg, base))

  const cleanImages = [...new Set(images)]
    .filter(src =>
      src.startsWith('http') &&
      !src.match(/\.(gif|svg)$/i) &&
      !src.match(/\/(sprite|icon|logo)\b/i)
    )
    .slice(0, 10)

  return { name, model, priceJPY, specs, images: cleanImages, site: 'amazon.co.jp' }
}

// ── Rakuten.co.jp ─────────────────────────────────────────────────────────────
async function scrapeRakuten(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const base = new URL(url)

  // Tên sản phẩm
  const name =
    $('h1.item_name').first().text().trim() ||
    $('h1[class*="itemName"]').first().text().trim() ||
    $('h1[class*="item-name"]').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim()

  // Giá
  const priceText =
    $('span[class*="price"]').first().text().trim() ||
    $('[class*="price--"]').first().text().trim() ||
    $('meta[property="product:price:amount"]').attr('content') ||
    ''
  const priceJPY = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null

  // Model — tìm trong JSON-LD hoặc text
  let model = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLd: any = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse($(el).html() ?? '{}')
      const items = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      for (const item of items) {
        if (item?.['@type'] === 'Product') { jsonLd = item; break }
      }
    } catch { /* ignore */ }
  })
  if (jsonLd?.sku) model = jsonLd.sku
  if (jsonLd?.mpn) model = jsonLd.mpn

  // Thông số — Rakuten thường dùng table hoặc dl trong mô tả sản phẩm
  const specs: Array<{ name: string; value: string }> = []
  const seen = new Set<string>()

  // Table specs
  $('table').each((_, table) => {
    $(table).find('tr').each((_, tr) => {
      const key = $(tr).find('th').text().replace(/\s+/g, ' ').trim()
      const val = $(tr).find('td').text().replace(/\s+/g, ' ').trim()
      if (key && val && key.length < 80 && val.length < 300 && !seen.has(key)) {
        seen.add(key); specs.push({ name: key, value: val })
      }
    })
  })

  // dl/dt/dd specs
  if (specs.length < 3) {
    $('dl').each((_, dl) => {
      const dts = $(dl).find('dt').toArray()
      const dds = $(dl).find('dd').toArray()
      dts.forEach((dt, i) => {
        const key = $(dt).text().replace(/\s+/g, ' ').trim()
        const val = $(dds[i])?.text().replace(/\s+/g, ' ').trim() ?? ''
        if (key && val && !seen.has(key)) { seen.add(key); specs.push({ name: key, value: val }) }
      })
    })
  }

  // Ảnh sản phẩm
  const images: string[] = []

  // JSON-LD images
  if (jsonLd?.image) {
    const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
    for (const img of imgs) {
      const u = typeof img === 'string' ? img : img?.url ?? img?.contentUrl ?? ''
      const r = resolveUrl(u, base)
      if (r && !images.includes(r)) images.push(r)
    }
  }

  // Gallery selectors
  for (const sel of [
    '[class*="imageGallery"] img', '[class*="gallery"] img',
    '[class*="item-image"] img', '[class*="itemImage"] img',
    '.rakuten-ichiba img', '#item_image img',
  ]) {
    $(sel).each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src') || ''
      const r = resolveUrl(src, base)
      if (r && !images.includes(r)) images.push(r)
    })
    if (images.length >= 8) break
  }

  // OG fallback
  const ogImg = $('meta[property="og:image"]').attr('content') ?? ''
  if (ogImg && !images.includes(ogImg)) images.push(resolveUrl(ogImg, base))

  const cleanImages = [...new Set(images)]
    .filter(src =>
      src.startsWith('http') &&
      !src.match(/\.(gif|svg)$/i) &&
      !src.match(/\/(logo|icon|sprite|banner|placeholder)\b/i) &&
      !src.match(/\d{1,2}x\d{1,2}\./)
    )
    .slice(0, 10)

  return { name, model, priceJPY, specs, images: cleanImages, site: 'rakuten.co.jp' }
}

// ── Kakaku.com ─────────────────────────────────────────────────────────────────
async function scrapeKakaku(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'ja,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const base = new URL(url)

  // Tên sản phẩm
  const name =
    $('h1[class*="ItemHeader_item-name"]').first().text().trim() ||
    $('h1.ItemHeader__item-name').first().text().trim() ||
    $('h1.productTitle').first().text().trim() ||
    $('h1[class*="name"]').first().text().trim() ||
    $('h1').first().text().trim()

  // Giá thấp nhất (JPY)
  const priceText =
    $('[class*="priceBox_itemPrice"]').first().text().trim() ||
    $('[class*="lowestPrice"]').first().text().trim() ||
    $('[class*="itemPrice"]').first().text().trim() ||
    $('[class*="lowest-price"]').first().text().trim() ||
    ''
  const priceJPY = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null

  // Model number / SKU
  const model =
    $('[class*="ItemHeader_specItem__"]').filter((_, el) => /型番|モデル|品番/i.test($(el).text())).find('dd,span').last().text().trim() ||
    $('dl.specItem').filter((_, el) => /型番|モデル/i.test($(el).text())).find('dd').first().text().trim() ||
    ''

  // Thông số kỹ thuật — bảng spec
  const specs: Array<{ name: string; value: string }> = []
  // Kakaku spec tables: #spec, .specTable, table[class*="spec"]
  for (const tableEl of $('table[class*="spec"], table[id*="spec"], .specTable, #tab_spec table').toArray()) {
    $(tableEl).find('tr').each((_, tr) => {
      const cells = $(tr).find('th,td').map((_, c) => $(c).text().trim()).get()
      if (cells.length >= 2) {
        const key = cells[0]?.replace(/\s+/g, ' ').trim() ?? ''
        const val = cells.slice(1).join(' / ').replace(/\s+/g, ' ').trim()
        if (key && val && key.length < 80) specs.push({ name: key, value: val })
      }
    })
  }

  // Nếu không có bảng, thử dl/dt/dd
  if (specs.length === 0) {
    $('dl').each((_, dl) => {
      const dts = $(dl).find('dt').toArray()
      const dds = $(dl).find('dd').toArray()
      dts.forEach((dt, i) => {
        const key = $(dt).text().trim()
        const val = $(dds[i]).text().replace(/\s+/g, ' ').trim()
        if (key && val) specs.push({ name: key, value: val })
      })
    })
  }

  // Ảnh sản phẩm
  const images: string[] = []

  // JSON-LD Product images
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = JSON.parse($(el).html() ?? '{}')
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data]
      for (const item of items) {
        if (item?.['@type'] === 'Product') {
          const imgs = Array.isArray(item.image) ? item.image : item.image ? [item.image] : []
          for (const img of imgs) {
            const u = typeof img === 'string' ? img : img?.url ?? img?.contentUrl ?? ''
            const resolved = resolveUrl(u, base)
            if (resolved && !images.includes(resolved)) images.push(resolved)
          }
        }
      }
    } catch { /* ignore */ }
  })

  // 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
  // Ảnh sản phẩm chính thức kakaku: /productimage/{size}/{ID}.jpg (nền trắng sạch).
  // Nâng các bản nhỏ (m/s/l/mid) → fullscale để lấy ảnh chất lượng cao nhất.
  const itemId = (url.match(/\/item\/(K\d+)/i) || [])[1] ?? ''
  $('img').each((_, el) => {
    let src = $(el).attr('data-src') || $(el).attr('data-lazy') || $(el).attr('src') || ''
    if (!/\/productimage\//i.test(src)) return
    src = src.replace(/\/productimage\/(m|s|l|mid)\//i, '/productimage/fullscale/')
    const resolved = resolveUrl(src, base)
    if (resolved && resolved.startsWith('http') && !images.includes(resolved)) images.push(resolved)
  })
  // Ưu tiên ảnh đúng item đang xem (itemId) lên đầu, biến thể màu khác xếp sau
  if (itemId) images.sort((a, b) => (b.includes(itemId) ? 1 : 0) - (a.includes(itemId) ? 1 : 0))

  // Chỉ giữ ảnh sản phẩm chính thức — loại bỏ shopicon/logo/btn/balloon/icon trang
  const cleanImages = [...new Set(images)]
    .filter(src =>
      src.startsWith('http') &&
      /\/productimage\//i.test(src) &&
      !src.match(/\.(svg|gif)$/i)
    )
    .slice(0, 10)

  return { name, model, priceJPY, specs, images: cleanImages, site: 'kakaku' }
}

// ── General Japanese product scraper ──────────────────────────────────────────
async function scrapeJapanGeneral(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'ja,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const base = new URL(url)

  // Tên sản phẩm
  let name = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLdProduct: any = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLdProduct) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse($(el).html() ?? '{}')
      const items = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      for (const item of items) {
        if (item?.['@type'] === 'Product') { jsonLdProduct = item; break }
      }
    } catch { /* ignore */ }
  })

  name = jsonLdProduct?.name || $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || ''

  const priceText =
    $('[itemprop="price"]').first().attr('content') ||
    $('[itemprop="price"]').first().text().trim() ||
    $('[class*="price"]').first().text().trim() ||
    ''
  const priceJPY = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null

  const specs: Array<{ name: string; value: string }> = []
  $('table').each((_, table) => {
    $(table).find('tr').each((_, tr) => {
      const cells = $(tr).find('th,td').map((_, c) => $(c).text().trim()).get()
      if (cells.length >= 2) {
        const key = cells[0]?.trim() ?? ''
        const val = cells.slice(1).join(' ').replace(/\s+/g, ' ').trim()
        if (key && val && key.length < 80 && val.length < 300) specs.push({ name: key, value: val })
      }
    })
  })

  const images: string[] = []
  if (jsonLdProduct?.image) {
    const imgs = Array.isArray(jsonLdProduct.image) ? jsonLdProduct.image : [jsonLdProduct.image]
    for (const img of imgs) {
      const u = typeof img === 'string' ? img : img?.url ?? img?.contentUrl ?? ''
      const r = resolveUrl(u, base)
      if (r) images.push(r)
    }
  }
  const ogImg = $('meta[property="og:image"]').attr('content') ?? ''
  if (ogImg && !images.includes(ogImg)) images.push(resolveUrl(ogImg, base))

  $('img').each((_, el) => {
    if (images.length >= 10) return
    const src = $(el).attr('data-src') || $(el).attr('src') || ''
    const r = resolveUrl(src, base)
    if (r && !images.includes(r)) images.push(r)
  })

  const cleanImages = [...new Set(images)]
    .filter(src =>
      src.startsWith('http') &&
      !src.match(/\/(logo|icon|sprite|avatar|blank|placeholder)\b/i) &&
      !src.match(/\.(svg|gif)$/i)
    )
    .slice(0, 10)

  return { name, model: '', priceJPY, specs, images: cleanImages, site: 'general' }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const { url } = await req.json()
    if (!url || !isSafeUrl(url)) return apiError('URL không hợp lệ', 400)

    const host = new URL(url).hostname.toLowerCase()
    const isKakaku = host.includes('kakaku.com')
    const isAmazon = host.includes('amazon.co.jp')
    const isRakuten = host.includes('rakuten.co.jp')

    const result = isAmazon
      ? await scrapeAmazonJP(url)
      : isKakaku
        ? await scrapeKakaku(url)
        : isRakuten
          ? await scrapeRakuten(url)
          : await scrapeJapanGeneral(url)

    if (!result.name && result.specs.length === 0) {
      return apiError('Không lấy được thông tin từ trang này', 422)
    }

    return apiSuccess(result)
  } catch (err) {
    return handleApiError(err)
  }
}
