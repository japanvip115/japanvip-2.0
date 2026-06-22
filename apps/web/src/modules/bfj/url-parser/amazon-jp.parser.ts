import * as cheerio from 'cheerio'
import type { ParsedProduct } from './types'

function toCanonicalUrl(url: string): string {
  try {
    const u = new URL(url)
    const asin = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)?.[1]
    if (!asin) return url
    // Use standard JP URL — avoids bot detection triggered by /-/en/ pattern
    return `https://www.amazon.co.jp/dp/${asin}/`
  } catch {
    return url
  }
}

function parseWeightKg(specs: { label: string; value: string }[]): number | null {
  const weightSpec = specs.find((s) =>
    /item weight|product weight|重量|重さ/i.test(s.label)
  )
  if (!weightSpec) return null

  const v = weightSpec.value
  // "2.8 kg" or "2.8Kg"
  const kgMatch = v.match(/(\d+\.?\d*)\s*kg/i)
  if (kgMatch) return Math.round(parseFloat(kgMatch[1]!) * 100) / 100

  // "6.1 lbs" or "(6.1 lbs)"
  const lbsMatch = v.match(/(\d+\.?\d*)\s*lbs?/i)
  if (lbsMatch) return Math.round(parseFloat(lbsMatch[1]!) * 0.453592 * 100) / 100

  // "280 g" but not "280 ml"
  const gMatch = v.match(/(\d+\.?\d*)\s*g(?!\s*al|\s*all?\b|\s*old\b)/i)
  if (gMatch) return Math.round((parseFloat(gMatch[1]!) / 1000) * 100) / 100

  return null
}

function extractModel(asin: string, specs: { label: string; value: string }[]): string {
  const modelSpec = specs.find((s) =>
    /item model number|model number|part number|品番|型番/i.test(s.label)
  )
  // Prefer explicit model number over ASIN
  return modelSpec?.value?.trim() || asin
}

async function fetchAmazonPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.amazon.co.jp/',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Amazon JP fetch failed: ${res.status}`)
  return res.text()
}

export async function parseAmazonJp(url: string): Promise<ParsedProduct> {
  const fetchUrl = toCanonicalUrl(url)
  const asin = fetchUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? ''

  const html = await fetchAmazonPage(fetchUrl)

  if (html.includes('Type the characters you see') || html.includes('/errors/validateCaptcha')) {
    throw new Error('Amazon đang yêu cầu xác minh CAPTCHA. Thử lại sau vài phút.')
  }

  const $ = cheerio.load(html)

  // Detect anti-bot / robot check page
  const pageTitle = $('title').text()
  if (pageTitle.includes('Robot') || pageTitle.toLowerCase().includes('sorry') ||
      html.includes('/errors/validateCaptcha') || html.includes('Type the characters')) {
    throw new Error('Amazon JP đang chặn yêu cầu tự động. Vui lòng thử lại sau ít phút.')
  }

  // Detect "not found" page
  if (pageTitle.includes('ページが見つかりません') || pageTitle.includes('Page Not Found') ||
      (!$('#productTitle').length && !$('#dp-container').length && !$('#ppd').length && html.length < 80000)) {
    throw new Error(`Sản phẩm không tìm thấy trên Amazon JP. Vui lòng kiểm tra lại ASIN (${asin || 'không xác định'}).`)
  }

  // ── Product name ──────────────────────────────────────────────────────────
  const productName =
    $('#productTitle').text().trim() ||
    $('h1.a-size-large').first().text().trim() ||
    $('[data-feature-name="title"] h1').first().text().trim() ||
    $('h1#title').first().text().trim() ||
    // Fallback: thẻ <title> (có cả khi trang bị rút gọn) — bỏ tiền tố "Amazon.co.jp:"
    (() => {
      const t = $('title').text().trim().replace(/^Amazon\.co\.jp\s*[：:]\s*/i, '').trim()
      return t.length > 5 ? t : ''
    })() ||
    null

  // ── Price ─────────────────────────────────────────────────────────────────
  // Strategy 1: JSON-LD structured data (works even when DOM price is hidden behind login)
  const extractPriceFromJsonLd = (): number | null => {
    let found: number | null = null
    $('script[type="application/ld+json"]').each((_, el) => {
      if (found) return
      try {
        const data = JSON.parse($(el).html() ?? '')
        const offers = data?.offers ?? (Array.isArray(data) ? data.flatMap((d: Record<string, unknown>) => d?.offers ?? []) : [])
        const offerList = Array.isArray(offers) ? offers : [offers]
        for (const offer of offerList) {
          const price = offer?.price ?? offer?.lowPrice
          if (price && !isNaN(Number(price)) && Number(price) > 0) {
            found = Math.round(Number(price))
            break
          }
        }
      } catch { /* malformed JSON-LD — skip */ }
    })
    return found
  }

  // Strategy 2: DOM selectors (buybox area only — avoid accessories section)
  const extractPrice = (sel: string) => $(sel).first().text().replace(/[^0-9]/g, '')
  const extractPriceFromDom = (): number | null => {
    const priceText =
      extractPrice('#corePriceDisplay_desktop_feature_div .a-price-whole') ||
      extractPrice('#corePrice_desktop .a-price-whole') ||
      extractPrice('#apex_desktop_qualifiedBuyBox .a-price-whole') ||
      extractPrice('#apex_desktop .a-price-whole') ||
      extractPrice('.priceToPay .a-price-whole') ||
      extractPrice('#tp_price_block_total_price_ww .a-price-whole') ||
      extractPrice('#price_inside_buybox') ||
      extractPrice('#priceblock_ourprice') ||
      extractPrice('#priceblock_dealprice') ||
      extractPrice('#apex_offerDisplay_desktop .a-price-whole') ||
      extractPrice('#buyNewSection .a-price-whole') ||
      (() => {
        let found = ''
        $('#buybox .a-price-whole, #desktop_qualifiedBuyBox .a-price-whole').each((_, el) => {
          const t = $(el).text().replace(/[^0-9]/g, '')
          if (t && t.length >= 3 && !found) found = t
        })
        return found
      })()
    if (priceText) return parseInt(priceText, 10)

    // Variation/twister tiles: price lives in a JSON a-state script inside #twister_feature_div
    // e.g. {"dimensionValueState":"SELECTED","slots":[{"displayData":{"priceWithoutCurrencySymbol":"39402"}}]}
    try {
      const twisterScript = $('#twister_feature_div script[type="a-state"]').filter((_, el) => {
        const state = $(el).attr('data-a-state') ?? ''
        return state.includes('desktop-twister-sort-filter-data')
      }).first().html()
      if (twisterScript) {
        const twisterData = JSON.parse(twisterScript)
        const allDims: unknown[][] = Object.values(twisterData?.sortedDimValuesForAllDims ?? {})
        for (const dimValues of allDims) {
          for (const variant of dimValues as Record<string, unknown>[]) {
            if (variant.dimensionValueState !== 'SELECTED') continue
            const slots = variant.slots as Record<string, unknown>[] | undefined
            for (const slot of slots ?? []) {
              const price = (slot.displayData as Record<string, unknown>)?.priceWithoutCurrencySymbol
              if (price && !isNaN(Number(price)) && Number(price) > 0) {
                return parseInt(String(price), 10)
              }
            }
          }
        }
      }
    } catch { /* malformed twister JSON — skip */ }

    return null
  }

  // Strategy 3: Offer listing page (separate fetch — only used when both above fail)
  const fetchOfferListingPrice = async (): Promise<number | null> => {
    try {
      const offerUrl = `https://www.amazon.co.jp/gp/offer-listing/${asin}/`
      const offerHtml = await fetchAmazonPage(offerUrl)
      // Bail out if we hit captcha/bot check on the offer page too
      if (offerHtml.includes('validateCaptcha') || offerHtml.includes('Type the characters')) return null
      const $o = cheerio.load(offerHtml)
      const priceText = $o('.a-price .a-offscreen').first().text().replace(/[^0-9]/g, '')
      return priceText && priceText.length >= 3 ? parseInt(priceText, 10) : null
    } catch {
      return null
    }
  }

  // Strategy 2.5: quét .a-offscreen trong vùng sản phẩm — bắt giá "từ ¥X" khi buybox ẩn
  // (vd hàng "cannot ship to location": chỉ hiện các tuỳ chọn biến thể "X options from ¥Y").
  // Trang Amazon fetch tĩnh: khu gợi ý/sponsored lazy-load (vắng mặt), nên .a-offscreen chủ yếu là
  // giá SP chính + các biến thể. Trả DANH SÁCH giá (distinct, tăng dần) để admin tự chọn đúng màu.
  const extractOffscreenPrices = (): number[] => {
    const set = new Set<number>()
    $('.a-offscreen').each((_, el) => {
      const n = parseInt($(el).text().replace(/[^0-9]/g, ''), 10)
      if (Number.isFinite(n) && n >= 1000) set.add(n)
    })
    return [...set].sort((a, b) => a - b)
  }

  const jsonLdPrice = extractPriceFromJsonLd()
  const domPrice = extractPriceFromDom()
  const offscreenPrices = (!jsonLdPrice && !domPrice) ? extractOffscreenPrices() : []
  const singleOffscreen = offscreenPrices.length === 1 ? offscreenPrices[0]! : null
  // Fetch offer listing only when ALL local strategies miss
  const offerPrice = (!jsonLdPrice && !domPrice && offscreenPrices.length === 0) ? await fetchOfferListingPrice() : null

  const unitPriceJpy = jsonLdPrice ?? domPrice ?? singleOffscreen ?? offerPrice
  // Nhiều biến thể (khác màu/cấu hình) → KHÔNG auto lấy min, để admin chọn giá đúng từ danh sách
  const priceOptionsJpy = offscreenPrices.length > 1 ? offscreenPrices : undefined

  // ── Images — parse hiRes JSON from script ─────────────────────────────────
  const imgScript = $('script').filter((_, el) => {
    const t = $(el).html() ?? ''
    return t.includes('colorImages') || t.includes('ImageBlockATF')
  }).first().html() ?? ''

  let images: string[] = []
  const hiResMatches = imgScript.match(/"hiRes":"(https:[^"]+)"/g)
  if (hiResMatches) {
    images = hiResMatches
      .map((m) => m.replace(/"hiRes":"/, '').replace(/"$/, ''))
      .filter((s) => s.startsWith('https'))
  }

  if (images.length === 0) {
    const fallback =
      $('#landingImage').attr('src') ||
      $('#imgBlkFront').attr('src') ||
      $('img#main-image').attr('src') ||
      $('meta[property="og:image"]').attr('content') || ''
    if (fallback) images = [fallback]
  }

  const productImage = images[0] ?? null

  // ── Description (feature bullets) ─────────────────────────────────────────
  const bullets: string[] = []
  $('#feature-bullets ul li span:not(.a-list-item)').each((_, el) => {
    const t = $(el).text().trim()
    if (t) bullets.push(t)
  })
  const description = bullets.length > 0
    ? '<ul>' + bullets.map((b) => `<li>${b}</li>`).join('') + '</ul>'
    : ($('#productDescription').html()?.trim() ?? '')

  // ── Specifications ────────────────────────────────────────────────────────
  const specifications: { label: string; value: string }[] = []
  const seenSpecLabels = new Set<string>()

  // Cover multiple Amazon JP spec table layouts
  const specSelectors = [
    '#productDetails_techSpec_section_1 tr',
    '#productDetails_techSpec_section_2 tr',
    '#productDetails_detailBullets_sections1 tr',
    '#productDetails_db_sections tr',       // layout used by many JP listings
    'table.prodDetTable tr',
    '#detailBullets_feature_div li',
  ].join(', ')

  $(specSelectors).each((_, el) => {
    const $el = $(el)
    if ($el.is('tr')) {
      const label = $el.find('th').text().trim()
      const value = $el.find('td').text().trim().replace(/\s+/g, ' ')
      if (label && value && !seenSpecLabels.has(label)) {
        seenSpecLabels.add(label)
        specifications.push({ label, value })
      }
    } else {
      const text = $el.text().trim()
      const parts = text.split(/[:：]/)
      if (parts.length >= 2) {
        const label = (parts[0] ?? '').trim()
        const value = parts.slice(1).join(':').trim()
        if (label && value && label.length < 60 && !seenSpecLabels.has(label)) {
          seenSpecLabels.add(label)
          specifications.push({ label, value })
        }
      }
    }
  })

  // ── Weight ────────────────────────────────────────────────────────────────
  const weightKg = parseWeightKg(specifications)

  // ── Model code ────────────────────────────────────────────────────────────
  const productModel = extractModel(asin, specifications)

  // ── Variations ────────────────────────────────────────────────────────────
  const variations: string[] = []
  $('#variation_color_name .selection').each((_, el) => {
    const v = $(el).text().trim()
    if (v) variations.push(`Màu: ${v}`)
  })
  $('#variation_size_name .selection').each((_, el) => {
    const v = $(el).text().trim()
    if (v) variations.push(`Size: ${v}`)
  })

  // ── Availability ──────────────────────────────────────────────────────────
  // #outOfStock is always in DOM (hidden via JS when in-stock) — can't trust it in static HTML
  // Rely on explicit out-of-stock text signals instead
  const availText = [
    $('#availability span').text(),
    $('#outOfStock').text(),
    $('#add-to-cart-button').length > 0 ? 'in-stock' : '',
  ].join(' ').toLowerCase()

  const explicitlyUnavailable =
    availText.includes('在庫切れ') ||
    availText.includes('取り扱いなし') ||
    availText.includes('currently unavailable') ||
    availText.includes('out of stock')

  // If add-to-cart button exists → definitely available
  const hasAddToCart = $('#add-to-cart-button, #buy-now-button').length > 0

  const available = !!productName && (hasAddToCart || !explicitlyUnavailable)

  return {
    platform: 'AMAZON_JP',
    sourceUrl: fetchUrl,
    productName,
    productNameVi: null, // filled by parse-url route after translation
    productModel,
    productImage,
    images,
    unitPriceJpy,
    priceOptionsJpy,
    weightKg,
    variations,
    available,
    description,
    specifications,
  }
}
