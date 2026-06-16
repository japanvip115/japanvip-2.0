import { parseAmazonJp } from './amazon-jp.parser'
import { parseRakuten } from './rakuten.parser'
import { parseMercari } from './mercari.parser'
import { parseYahooShopping } from './yahoo-shopping.parser'
import type { ParsedProduct } from './types'
import { prisma } from '@japanvip/db'

export function detectPlatform(url: string): ParsedProduct['platform'] {
  try {
    const { hostname } = new URL(url)
    if (hostname.includes('amazon.co.jp')) return 'AMAZON_JP'
    if (hostname.includes('rakuten.co.jp')) return 'RAKUTEN'
    if (hostname.includes('mercari.com')) return 'MERCARI'
    if (hostname.includes('shopping.yahoo.co.jp')) return 'YAHOO_SHOPPING'
    return 'OTHER'
  } catch {
    return 'OTHER'
  }
}

export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const supported = [
      'amazon.co.jp',
      'www.amazon.co.jp',
      'rakuten.co.jp',
      'item.rakuten.co.jp',
      'mercari.com',
      'jp.mercari.com',
      'shopping.yahoo.co.jp',
    ]
    return supported.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export async function parseProductUrl(url: string): Promise<ParsedProduct> {
  const platform = detectPlatform(url)

  let result: ParsedProduct
  let success = false
  let errorMessage: string | null = null

  try {
    switch (platform) {
      case 'AMAZON_JP':
        result = await parseAmazonJp(url)
        break
      case 'RAKUTEN':
        result = await parseRakuten(url)
        break
      case 'MERCARI':
        result = await parseMercari(url)
        break
      case 'YAHOO_SHOPPING':
        result = await parseYahooShopping(url)
        break
      default:
        result = {
          platform: 'OTHER',
          sourceUrl: url,
          productName: null,
          productNameVi: null,
          productModel: null,
          productImage: null,
          images: [],
          unitPriceJpy: null,
          weightKg: null,
          variations: [],
          available: false,
          description: '',
          specifications: [],
        }
    }
    success = true
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Parse failed'
    result = {
      platform,
      sourceUrl: url,
      productName: null,
      productNameVi: null,
      productModel: null,
      productImage: null,
      images: [],
      unitPriceJpy: null,
      weightKg: null,
      variations: [],
      available: false,
      description: '',
      specifications: [],
    }
  }

  // Log parse attempt (non-blocking)
  prisma.bfjUrlParseLog
    .create({
      data: {
        url,
        platform,
        parsedData: success ? (result as any) : null,
        success,
        errorMessage,
      },
    })
    .catch(() => {})

  return result
}
