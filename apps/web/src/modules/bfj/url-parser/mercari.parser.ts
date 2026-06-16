import * as cheerio from 'cheerio'
import type { ParsedProduct } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'ja-JP,ja;q=0.9',
}

export async function parseMercari(url: string): Promise<ParsedProduct> {
  // Mercari uses heavy JS rendering — extract from meta tags + JSON-LD
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Mercari fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // Try JSON-LD first — most reliable for Mercari
  let productName: string | null = null
  let productImage: string | null = null
  let unitPriceJpy: number | null = null
  let available = false

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      if (data['@type'] === 'Product') {
        productName = data.name ?? null
        productImage = data.image?.[0] ?? data.image ?? null
        const offer = data.offers
        if (offer?.price) unitPriceJpy = parseInt(String(offer.price), 10)
        available = offer?.availability?.includes('InStock') ?? false
      }
    } catch {
      // ignore malformed JSON-LD
    }
  })

  // Fallback to meta tags
  if (!productName) productName = $('meta[property="og:title"]').attr('content') ?? null
  if (!productImage) productImage = $('meta[property="og:image"]').attr('content') ?? null
  if (!productName) productName = $('h1').first().text().trim() || null

  return {
    platform: 'MERCARI',
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
