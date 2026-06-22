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

// 🔒 LOCKED (2026-06) — Tự lấy cân nặng Mua Hộ (đơn vị JP/EN, ưu tiên cân SP, fallback HTML). Xem CLAUDE.md → LOCKED → Mua Hộ.
function weightFromValue(v: string): number | null {
  // "2.8 kg" / "2.8Kg" / "2.8 キログラム" / "2.8キロ"
  const kgMatch = v.match(/(\d+\.?\d*)\s*(?:kg|キログラム|キロ(?!カロリー))/i)
  if (kgMatch) return Math.round(parseFloat(kgMatch[1]!) * 100) / 100

  // "6.1 lbs" / "6.1 ポンド"
  const lbsMatch = v.match(/(\d+\.?\d*)\s*(?:lbs?|ポンド)/i)
  if (lbsMatch) return Math.round(parseFloat(lbsMatch[1]!) * 0.453592 * 100) / 100

  // "280 g" / "280 グラム" (but not "280 ml")
  const gMatch = v.match(/(\d+\.?\d*)\s*(?:グラム|g(?!\s*al|\s*all?\b|\s*old\b))/i)
  if (gMatch) return Math.round((parseFloat(gMatch[1]!) / 1000) * 100) / 100

  return null
}

// 商品の重量 / 梱包重量 / パッケージ重量 / 本体重量 / 発送重量 ... — nhãn cân nặng JP/EN thường gặp
const WEIGHT_LABEL_RE = /item weight|product weight|package weight|shipping weight|重量|重さ|質量/i

function parseWeightKg(
  specs: { label: string; value: string }[],
  rawHtml?: string
): number | null {
  // Ưu tiên cân nặng SẢN PHẨM (本体/商品) hơn cân nặng kiện hàng (梱包/パッケージ/発送)
  const productFirst = [...specs].sort((a, b) => {
    const pa = /梱包|パッケージ|package|shipping|発送/i.test(a.label) ? 1 : 0
    const pb = /梱包|パッケージ|package|shipping|発送/i.test(b.label) ? 1 : 0
    return pa - pb
  })
  for (const s of productFirst) {
    if (WEIGHT_LABEL_RE.test(s.label)) {
      const kg = weightFromValue(s.value)
      if (kg) return kg
    }
  }

  // Fallback: quét HTML thô tìm cụm "重量 ... <số> kg/g" khi specs không bắt được nhãn
  if (rawHtml) {
    const m = rawHtml.match(/(?:重量|重さ|質量|weight)[^0-9<]{0,40}?(\d+\.?\d*)\s*(kg|g|キログラム|グラム|キロ)/i)
    if (m) {
      const kg = weightFromValue(`${m[1]} ${m[2]}`)
      if (kg) return kg
    }
  }

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

// 🔒 LOCKED (2026-06) — Mua Hộ Amazon JP đã chốt & khoá (tên/giá/biến thể/lọc spec).
// KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md (mục LOCKED → Mua Hộ).
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

  // 🔒 LOCKED (2026-06) — Strategy 3: offer-listing THẬT. Hàng cannot-ship → trang này redirect về dp,
  // .a-offscreen = giá sims rác → guard #productTitle + chỉ đọc hàng offer thật. Xem CLAUDE.md → LOCKED → Mua Hộ.
  const fetchOfferListingPrice = async (): Promise<number | null> => {
    try {
      const offerUrl = `https://www.amazon.co.jp/gp/offer-listing/${asin}/`
      const offerHtml = await fetchAmazonPage(offerUrl)
      // Bail out if we hit captcha/bot check on the offer page too
      if (offerHtml.includes('validateCaptcha') || offerHtml.includes('Type the characters')) return null
      const $o = cheerio.load(offerHtml)
      // Hàng "cannot ship" → /gp/offer-listing/ bị redirect về TRANG DP đầy đủ (có #productTitle).
      // Khi đó .a-offscreen là giá widget hàng liên quan (sims) → rác. Chỉ đọc giá từ HÀNG OFFER THẬT.
      if ($o('#productTitle').length > 0) return null
      const priceText = $o('#aod-offer .a-price .a-offscreen, .aod-offer .a-price .a-offscreen, #olpOfferList .a-price .a-offscreen, .olpOffer .a-price .a-offscreen, [id^="aod-offer"] .a-price .a-offscreen')
        .first().text().replace(/[^0-9]/g, '')
      return priceText && priceText.length >= 3 ? parseInt(priceText, 10) : null
    } catch {
      return null
    }
  }

  // 🔒 LOCKED (2026-06) — Quy tắc giá Mua Hộ. Xem CLAUDE.md → LOCKED → Mua Hộ.
  // ⚠️ KHÔNG dùng .a-offscreen làm giá: khi buybox ẩn ("cannot ship"), các .a-offscreen còn lại
  // CHỈ là giá widget "sản phẩm liên quan/gợi ý/mua kèm" (vd giá đỡ ¥6.979) → luôn sai cho máy chính,
  // và DOM Amazon đổi mỗi lần fetch nên không lọc tin cậy được. Giá ẩn → để khách NHẬP TAY (đúng luật gốc).
  //
  // Loại giá thấp bất thường (parse nhầm điểm thưởng / số review / chữ số rác — vd "¥17" cho hàng vật lý).
  // Áp dụng cho TỪNG nguồn để một giá rác không che mất giá đúng từ nguồn khác trong chuỗi ?? bên dưới.
  const MIN_PRICE_JPY = 100
  const sanePrice = (n: number | null): number | null =>
    n !== null && n >= MIN_PRICE_JPY ? n : null

  const jsonLdPrice = sanePrice(extractPriceFromJsonLd())
  const domPrice = sanePrice(extractPriceFromDom())
  // Offer-listing = giá thật của CÙNG ASIN từ người bán khác → đáng tin; chỉ gọi khi buybox ẩn.
  const offerPrice = (!jsonLdPrice && !domPrice) ? sanePrice(await fetchOfferListingPrice()) : null

  const unitPriceJpy = jsonLdPrice ?? domPrice ?? offerPrice
  // Bỏ "dải giá tham khảo": nguồn cũ (.a-offscreen) là giá widget hàng liên quan → sai. Khi giá ẩn = nhập tay.
  const priceOptionsJpy = undefined

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

  // Lọc spec rác: giá trị dính code JS (widget đánh giá), quá dài, hoặc nhãn review/ranking (không phải thông số)
  const isJunkSpec = (label: string, value: string): boolean => {
    if (value.length > 300) return true
    if (/function\s*\(|P\.when|\.execute\(|ue\.count|\.declarative|window\.ue|var\s+dp|!==\s*true|===\s*true/.test(value)) return true
    if (/レビュー|ランキング|おすすめ度|売れ筋|Customer Reviews|Best Sellers|Boutique/i.test(label)) return true
    return false
  }

  $(specSelectors).each((_, el) => {
    const $el = $(el)
    $el.find('script, style').remove() // tránh nuốt JS của widget vào value
    if ($el.is('tr')) {
      const label = $el.find('th').text().trim()
      const value = $el.find('td').text().trim().replace(/\s+/g, ' ')
      if (label && value && !seenSpecLabels.has(label) && !isJunkSpec(label, value)) {
        seenSpecLabels.add(label)
        specifications.push({ label, value })
      }
    } else {
      const text = $el.text().trim()
      const parts = text.split(/[:：]/)
      if (parts.length >= 2) {
        const label = (parts[0] ?? '').trim()
        const value = parts.slice(1).join(':').trim()
        if (label && value && label.length < 60 && !seenSpecLabels.has(label) && !isJunkSpec(label, value)) {
          seenSpecLabels.add(label)
          specifications.push({ label, value })
        }
      }
    }
  })

  // ── Weight ────────────────────────────────────────────────────────────────
  const weightKg = parseWeightKg(specifications, html)

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

  // ── Biến thể màu (ảnh + tên + link để bấm chọn) — tránh khách đặt nhầm biến thể ──
  // Map tên màu (JP) → ASIN từ twister JSON để dựng link biến thể chính xác
  const colorAsinMap: Record<string, string> = {}
  try {
    const twJson = $('script[type="a-state"]').filter((_, e) => ($(e).attr('data-a-state') ?? '').includes('twister-sort-filter')).first().html()
    if (twJson) {
      const tw = JSON.parse(twJson)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const v of (tw?.sortedDimValuesForAllDims?.color_name ?? []) as any[]) {
        if (v?.dimensionValueDisplayText && v?.defaultAsin) colorAsinMap[v.dimensionValueDisplayText] = v.defaultAsin
      }
    }
  } catch { /* ignore */ }

  const colorVariants: { name: string; image: string; url?: string }[] = []
  const seenColorVar = new Set<string>()
  $('[id*="twister"] li img, [class*="swatch"] li img, [class*="dimension"] li img, #inline-twister-card li img').each((_, el) => {
    const name = ($(el).attr('alt') ?? '').trim()
    let img = $(el).attr('src') ?? ''
    if (!name || name.length > 40 || /利用可能なオプション|See available|表示|options/i.test(name)) return
    if (img.startsWith('//')) img = 'https:' + img
    if (!img.startsWith('http') || seenColorVar.has(name)) return
    seenColorVar.add(name)
    const vAsin = colorAsinMap[name]
    colorVariants.push({ name, image: img, url: vAsin ? `https://www.amazon.co.jp/dp/${vAsin}/` : undefined })
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
    colorVariants: colorVariants.length > 0 ? colorVariants : undefined,
    weightKg,
    variations,
    available,
    description,
    specifications,
  }
}
