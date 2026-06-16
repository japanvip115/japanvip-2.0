import * as cheerio from 'cheerio'
import type { ParsedProduct } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9',
}

export async function parseYahooShopping(url: string): Promise<ParsedProduct> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Yahoo Shopping fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // Try JSON-LD (Yahoo Shopping often includes it)
  let productName: string | null = null
  let productImage: string | null = null
  let unitPriceJpy: number | null = null
  let available = true

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      if (data['@type'] === 'Product') {
        productName = data.name ?? null
        productImage = Array.isArray(data.image) ? data.image[0] : data.image ?? null
        const offer = data.offers
        if (offer?.price) unitPriceJpy = parseInt(String(offer.price), 10)
        available = offer?.availability?.includes('InStock') ?? true
      }
    } catch {
      // ignore
    }
  })

  // Fallback — HTML selectors
  if (!productName) {
    productName =
      $('h1.elTitle').text().trim() ||
      $('h1[class*="itemName"]').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      null
  }

  if (!productImage) {
    productImage =
      $('img.elImage').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      null
  }

  if (!unitPriceJpy) {
    const priceText =
      $('span[class*="price"]').first().text().replace(/[^0-9]/g, '') ||
      $('.ItemPrice').text().replace(/[^0-9]/g, '')
    if (priceText) unitPriceJpy = parseInt(priceText, 10)
  }

  return {
    platform: 'YAHOO_SHOPPING',
    sourceUrl: url,
    productName,
    productNameVi: null,
    productModel: null,
    productImage,
    images: productImage ? [productImage] : [],
    unitPriceJpy,
    weightKg: null,
    variations: [],
    available,
    description: '',
    specifications: [],
  }
}
