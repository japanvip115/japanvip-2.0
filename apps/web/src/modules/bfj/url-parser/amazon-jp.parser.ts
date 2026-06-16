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
    null

  // ── Price ─────────────────────────────────────────────────────────────────
  // Must target buybox/main price specifically — .a-price-whole is too broad
  // and matches the first occurrence on page (could be accessories/recommendations)
  const extractPrice = (sel: string) => $(sel).first().text().replace(/[^0-9]/g, '')
  const priceText =
    // Most specific: desktop buybox containers (ordered by reliability)
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
    // Last resort: any buybox container
    (() => {
      let found = ''
      $('#buybox .a-price-whole, #desktop_qualifiedBuyBox .a-price-whole').each((_, el) => {
        const t = $(el).text().replace(/[^0-9]/g, '')
        if (t && t.length >= 3 && !found) found = t
      })
      return found
    })()
  const unitPriceJpy = priceText ? parseInt(priceText, 10) : null

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
  $('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li').each((_, el) => {
    const $el = $(el)
    if ($el.is('tr')) {
      const label = $el.find('th').text().trim()
      const value = $el.find('td').text().trim().replace(/\s+/g, ' ')
      if (label && value) specifications.push({ label, value })
    } else {
      const text = $el.text().trim()
      const parts = text.split(/[:：]/)
      if (parts.length >= 2) {
        const label = (parts[0] ?? '').trim()
        const value = parts.slice(1).join(':').trim()
        if (label && value && label.length < 60) specifications.push({ label, value })
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
  const outOfStock =
    $('#outOfStock').length > 0 ||
    $('#availability .a-color-price').text().toLowerCase().includes('unavailable')
  const available = !outOfStock && !!productName

  return {
    platform: 'AMAZON_JP',
    sourceUrl: fetchUrl,
    productName,
    productNameVi: null, // filled by parse-url route after translation
    productModel,
    productImage,
    images,
    unitPriceJpy,
    weightKg,
    variations,
    available,
    description,
    specifications,
  }
}
