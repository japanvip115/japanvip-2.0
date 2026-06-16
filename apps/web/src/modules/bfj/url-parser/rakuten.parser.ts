import * as cheerio from 'cheerio'
import type { ParsedProduct } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9',
}

export async function parseRakuten(url: string): Promise<ParsedProduct> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Rakuten fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  const productName =
    $('h1.item_name').text().trim() ||
    $('h1.b-ttl-main').text().trim() ||
    $('h1').first().text().trim() ||
    null

  const productImage =
    $('.rakuten-image img').first().attr('src') ||
    $('img#Rakuten_itemImage').attr('src') ||
    $('meta[property="og:image"]').attr('content') ||
    null

  const priceText =
    $('.price2').text().replace(/[^0-9]/g, '') ||
    $('span.price').first().text().replace(/[^0-9]/g, '') ||
    ''

  const unitPriceJpy = priceText ? parseInt(priceText, 10) : null

  const available =
    $('.add-to-cart-area input[type="submit"]').length > 0 || !!productName

  return {
    platform: 'RAKUTEN',
    sourceUrl: url,
    productName,
    productNameVi: null,
    productModel: null,
    productImage: productImage ? normalizeImageUrl(productImage) : null,
    images: productImage ? [normalizeImageUrl(productImage)] : [],
    unitPriceJpy,
    weightKg: null,
    variations: [],
    available,
    description: '',
    specifications: [],
  }
}

function normalizeImageUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  return url
}
