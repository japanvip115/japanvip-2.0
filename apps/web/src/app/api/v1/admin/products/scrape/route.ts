import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { apiSuccess, apiError } from '@/lib/api-response'

function isSafeUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false
  const h = parsed.hostname.toLowerCase()
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ]
  return !blocked.some((r) => r.test(h))
}

function parsePrice(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '')
  const n = parseInt(digits, 10)
  return isNaN(n) || n <= 0 ? null : n
}

function resolveUrl(src: string, base: URL): string {
  if (!src) return ''
  if (src.startsWith('http')) return src
  if (src.startsWith('//')) return base.protocol + src
  if (src.startsWith('/')) return `${base.protocol}//${base.host}${src}`
  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(img: any): string {
  if (typeof img === 'string') return img
  if (typeof img === 'object' && img !== null) {
    return img.url ?? img.contentUrl ?? ''
  }
  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanHtml($: ReturnType<typeof cheerio.load>, el: any): string {
  $(el).find('script, iframe, form, style, noscript').remove()
  $(el).find('[class*="social"], [class*="share"], [class*="related"]').remove()
  // Remove hidden elements
  $(el).find('[style*="display:none"], [style*="display: none"]').remove()
  return $(el).html()?.trim() ?? ''
}

function cleanAmazonUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if (!u.hostname.includes('amazon.')) return raw
    // Extract ASIN from /dp/XXXXXXXXXX/
    const m = u.pathname.match(/\/dp\/([A-Z0-9]{10})/)
    if (!m) return raw
    const asin = m[1]
    // Preserve /en/ path if user wants English content
    const isEnPath = u.pathname.includes('/-/en/') || u.searchParams.get('language')?.startsWith('en')
    const lang = isEnPath ? '?language=en_US' : ''
    const enPath = isEnPath ? '/-/en/' : '/'
    return `${u.protocol}//${u.hostname}${enPath}dp/${asin}/${lang}`
  } catch {}
  return raw
}

function isAmazonUrl(url: string): boolean {
  try { return new URL(url).hostname.includes('amazon.') } catch { return false }
}

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return apiError('Yêu cầu không hợp lệ', 400)
  }

  let url = body.url?.trim() ?? ''
  if (!url) return apiError('URL không được để trống', 400)
  if (!isSafeUrl(url)) return apiError('URL không hợp lệ hoặc không được phép', 400)

  // Clean Amazon URL — strip tracking params, keep only /dp/ASIN/
  url = cleanAmazonUrl(url)
  const isAmazon = isAmazonUrl(url)

  let html: string
  try {
    const isEnAmazon = isAmazon && url.includes('language=en_US')
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': isAmazon
          ? (isEnAmazon ? 'en-US,en;q=0.9' : 'ja-JP,ja;q=0.9,en-US;q=0.8')
          : 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return apiError(`Trang trả về lỗi HTTP ${res.status}`, 422)
    html = await res.text()
    // Amazon CAPTCHA detection
    if (isAmazon && (html.includes('Type the characters you see') || html.includes('Robot Check') || html.includes('/errors/validateCaptcha'))) {
      return apiError('Amazon đang yêu cầu xác minh bot. Thử lại sau vài phút hoặc dán URL từ tab ẩn danh.', 422)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout') || msg.includes('abort')) {
      return apiError('Trang phản hồi quá chậm (> 15 giây)', 422)
    }
    return apiError('Không thể kết nối đến URL. Kiểm tra lại đường dẫn.', 422)
  }

  const $ = cheerio.load(html)
  const baseUrl = new URL(url)

  // ── 1. JSON-LD Product ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLd: any = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse($(el).html() ?? '{}')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      for (const item of items) {
        if (item?.['@type'] === 'Product') { jsonLd = item; break }
      }
    } catch { /* ignore */ }
  })

  // ── 2. Open Graph ─────────────────────────────────────────────────────────
  const og = {
    title: $('meta[property="og:title"]').attr('content') ?? '',
    description: $('meta[property="og:description"]').attr('content') ?? '',
    image: $('meta[property="og:image"]').attr('content') ?? '',
  }

  // ── 3. Core fields ────────────────────────────────────────────────────────
  let name = ''
  let description = ''
  let brand = ''
  let sku = ''
  let price: number | null = null
  let images: string[] = []
  let shortDescriptionHtml = ''
  let descriptionHtml = ''
  type SpecRow = { label: string; value: string }
  let specifications: SpecRow[] = []

  if (jsonLd) {
    // Name: prefer H1 (more display-friendly) — will override below
    name = jsonLd.name ?? ''
    description = typeof jsonLd.description === 'string' ? jsonLd.description : ''
    sku = jsonLd.sku ?? jsonLd.mpn ?? ''
    brand =
      typeof jsonLd.brand === 'string'
        ? jsonLd.brand
        : (jsonLd.brand?.name ?? '')

    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers
    if (offer?.price) price = parseFloat(String(offer.price).replace(/[^0-9.]/g, '')) || null

    // Fix: ImageObject has .url, not string
    const imgRaw = jsonLd.image
    if (imgRaw) {
      const arr = Array.isArray(imgRaw) ? imgRaw : [imgRaw]
      images = arr.map(extractImageUrl).filter(Boolean)
    }
  }

  // ── Amazon-specific extraction ────────────────────────────────────────────
  if (isAmazon) {
    // Title
    const amzTitle = $('#productTitle').text().trim()
    if (amzTitle) name = amzTitle

    // Brand
    if (!brand) {
      brand =
        $('#bylineInfo').text().replace(/^(ブランド|Brand)[:：\s]*/i, '').trim() ||
        $('a#bylineInfo').text().trim() ||
        ''
    }

    // ASIN as SKU
    if (!sku) {
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/)
      if (asinMatch?.[1]) sku = asinMatch[1]
    }

    // Feature bullets → shortDescriptionHtml
    const bullets: string[] = []
    $('#feature-bullets ul li span:not(.a-list-item)').each((_, el) => {
      const t = $(el).text().trim()
      if (t) bullets.push(`<li>${t}</li>`)
    })
    if (bullets.length > 0) shortDescriptionHtml = `<ul>${bullets.join('')}</ul>`

    // Description
    if (!descriptionHtml) {
      const amzDesc = $('#productDescription').html()?.trim() ?? ''
      if (amzDesc.length > 50) descriptionHtml = amzDesc
    }

    // Amazon images — parse JSON from script tag
    const imgScript = $('script').filter((_, el) => {
      return ($(el).html() ?? '').includes('colorImages') || ($(el).html() ?? '').includes('ImageBlockATF')
    }).first().html() ?? ''

    const imgMatches = imgScript.match(/"hiRes":"(https:[^"]+)"/g)
    if (imgMatches && imgMatches.length > 0) {
      const extracted = imgMatches
        .map((m) => m.replace(/"hiRes":"/, '').replace(/"$/, ''))
        .filter((s) => s.startsWith('http'))
      if (extracted.length > 0) images = extracted
    }

    // Fallback: og:image
    if (images.length === 0 && og.image) images = [og.image]

    // Product details table (thông số kỹ thuật)
    if (specifications.length === 0) {
      const rows: { label: string; value: string }[] = []
      $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr').each((_, tr) => {
        const label = $(tr).find('th').text().trim()
        const value = $(tr).find('td').text().trim().replace(/\s+/g, ' ')
        if (label && value) rows.push({ label, value })
      })
      if (rows.length > 0) specifications = rows
    }
  }

  // H1 title is usually the product display name — override JSON-LD name (non-Amazon)
  if (!isAmazon) {
    const h1Text =
      $('h1.product_title').first().text().trim() ||
      $('h1[class*="product"]').first().text().trim() ||
      $('h1').first().text().trim()
    if (h1Text) name = h1Text
  }

  if (!name) name = og.title
  if (!description) {
    description =
      og.description ||
      $('meta[name="description"]').attr('content') ||
      $('[itemprop="description"]').text().trim() ||
      ''
  }
  if (!brand) {
    brand =
      $('[itemprop="brand"]').text().trim() ||
      $('meta[name="brand"]').attr('content') ||
      $('[class*="brand"]').first().text().trim() ||
      ''
  }
  if (!sku) {
    sku =
      $('[itemprop="sku"]').text().trim() ||
      $('span.sku').text().trim() ||
      $('[class*="sku"]').first().text().trim() ||
      ''
  }

  // Price fallback
  if (!price) {
    const priceSelectors = [
      '[itemprop="price"]',
      '.product-price',
      '.price',
      '[class*="price"]',
      '.woocommerce-Price-amount',
      '.entry-summary .price',
      '.product__price',
      'span[class*="price"]',
    ]
    for (const sel of priceSelectors) {
      const el = $(sel).first()
      const content = el.attr('content') || el.text()
      if (content) {
        const extracted = parsePrice(content)
        if (extracted && extracted > 0) { price = extracted; break }
      }
    }
  }

  // ── 4. Short description (tính năng nổi bật, xuất xứ, bảo hành…) ─────────
  const shortDescSelectors = [
    '.woocommerce-product-details__short-description',
    '.product-short-description',
    '[class*="short-description"]',
    '.product-excerpt',
    '[class*="excerpt"]',
  ]
  if (!shortDescriptionHtml) {
    for (const sel of shortDescSelectors) {
      const el = $(sel).first()
      if (!el.length) continue
      const cleaned = cleanHtml($, el)
      if (cleaned.length > 20) { shortDescriptionHtml = cleaned; break }
    }
  }

  // ── 5. Images ─────────────────────────────────────────────────────────────
  if (!isAmazon) {
    if (images.length === 0 && og.image) images = [og.image]

    // data-large_image (WooCommerce full-size) — most reliable
    $('[data-large_image]').each((_, el) => {
      const src = $(el).attr('data-large_image') ?? ''
      if (src && !images.includes(src)) images.push(src)
    })
  }

  // Fallback gallery selectors (non-Amazon only)
  if (!isAmazon && images.length < 5) {
    const galSelectors = [
      '.woocommerce-product-gallery img',
      '.product-gallery img',
      '[class*="gallery"] img',
      '[class*="slider"] img',
      '.swiper-slide img',
      'figure img',
    ]
    for (const sel of galSelectors) {
      $(sel).each((_, el) => {
        const src =
          $(el).attr('data-src') ||
          $(el).attr('data-lazy-src') ||
          $(el).attr('data-original') ||
          $(el).attr('src') ||
          ''
        const resolved = resolveUrl(src, baseUrl)
        if (resolved && !images.includes(resolved)) images.push(resolved)
      })
      if (images.length >= 10) break
    }
  }

  images = [...new Set(images)]
    .map((src) => resolveUrl(src, baseUrl))
    .filter(
      (src) =>
        src.startsWith('http') &&
        !src.match(/\/(icon|logo|sprite|avatar|blank|placeholder)\b/i) &&
        !src.match(/\.(svg|gif)$/i) &&
        !src.match(/\d{1,2}x\d{1,2}\./),
    )
    .slice(0, 10)

  // ── 6. Specifications table ───────────────────────────────────────────────
  const specTableSelectors = [
    '.woocommerce-product-attributes',
    'table.specifications',
    'table.specs',
    'table[class*="spec"]',
    'table[class*="thong-so"]',
    'table[class*="technical"]',
    '.specification-table table',
    '.specifications table',
    '.specs-table',
    '.product-specifications table',
    '.thong-so-ky-thuat table',
    '[class*="specification"] table',
    '[class*="thong-so"] table',
  ]

  for (const sel of specTableSelectors) {
    const table = $(sel).first()
    if (!table.length) continue
    const rows: SpecRow[] = []
    table.find('tr').each((_, tr) => {
      const cells = $(tr).find('th, td')
      if (cells.length >= 2) {
        const label = cells.eq(0).text().trim()
        const value = cells.eq(cells.length - 1).text().trim()
        if (label && value) rows.push({ label, value })
      }
    })
    if (rows.length > 0) { specifications = rows; break }
  }

  // Fallback: any 2-col table with ≥3 rows
  if (specifications.length === 0) {
    $('table').each((_, table) => {
      if (specifications.length > 0) return
      const rows: SpecRow[] = []
      $(table).find('tr').each((_, tr) => {
        const cells = $(tr).find('th, td')
        if (cells.length === 2) {
          const label = cells.eq(0).text().trim()
          const value = cells.eq(1).text().trim()
          if (label && value && label.length < 100) rows.push({ label, value })
        }
      })
      if (rows.length >= 3) specifications = rows
    })
  }

  // ── 7. Full description HTML ──────────────────────────────────────────────
  const descSelectors = [
    '#tab-description',
    '.woocommerce-Tabs-panel--description',
    '.wwoocommerce-Tabs-panel--description',
    '.product-description',
    '.entry-content',
    '[class*="product-detail"]',
    '[class*="product-content"]',
    '[class*="mo-ta"]',
    '[itemprop="description"]',
  ]
  if (!descriptionHtml) {
    for (const sel of descSelectors) {
      const el = $(sel).first()
      if (!el.length) continue
      const cleaned = cleanHtml($, el)
      if (cleaned.length > 100) { descriptionHtml = cleaned; break }
    }
  }

  if (!name && !description && images.length === 0) {
    return apiError(
      'Không tìm thấy thông tin sản phẩm. Trang có thể dùng JavaScript động (SPA) hoặc yêu cầu đăng nhập.',
      422,
    )
  }

  return apiSuccess({
    name: name.trim(),
    sku: sku.trim(),
    brand: brand.trim(),
    price,
    description: description.trim(),
    shortDescriptionHtml,
    descriptionHtml,
    specifications,
    images,
    originUrl: url,
    metaTitle: (og.title || name).trim().slice(0, 60),
    metaDesc: (og.description || description).trim().slice(0, 160),
  })
}
