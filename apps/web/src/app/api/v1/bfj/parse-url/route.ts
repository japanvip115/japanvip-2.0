import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { parseProductUrl, validateUrl } from '@/modules/bfj/url-parser/parser.factory'
import { translateProductName, translateSpecs } from '@/modules/bfj/services/translate.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { getCached, setCached } from '@/lib/redis'

const schema = z.object({
  url: z.string().url('URL không hợp lệ'),
  refresh: z.boolean().optional(), // true = bỏ qua cache, parse lại
})

// 🔒 LOCKED (2026-06) — Cache parse Mua Hộ. KHÔNG sửa nếu chưa được chủ dự án yêu cầu (xem CLAUDE.md → LOCKED → Mua Hộ).
// Cache kết quả parse theo ASIN/URL chuẩn hoá để lần sau khỏi load lại (specs/ảnh/tên/cân nặng hiếm khi đổi).
const PARSE_CACHE_TTL = 86400 // 24h
// v2: bỏ cache cũ nhiễm giá rác .a-offscreen (priceOptionsJpy/unitPriceJpy sai từ widget hàng liên quan)
const PARSE_CACHE_VER = 'v4'
function parseCacheKey(url: string): string {
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)
  const asin = m?.[1]?.toUpperCase()
  return asin ? `bfj:parse:${PARSE_CACHE_VER}:asin:${asin}` : `bfj:parse:${PARSE_CACHE_VER}:url:${url}`
}

export async function POST(req: NextRequest) {
  // Public endpoint — auth not required to view product info
  // Price/estimate and order endpoints require auth separately
  const { allowed } = await rateLimit(req, 'bfj:parse-url')
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau', 429)

  try {
    const body = schema.parse(await req.json())

    if (!validateUrl(body.url)) {
      return apiError(
        'Chỉ hỗ trợ URL từ Amazon JP, Rakuten, Mercari, Yahoo Shopping Japan',
        422
      )
    }

    const cacheKey = parseCacheKey(body.url)
    if (!body.refresh) {
      const cached = await getCached(cacheKey)
      if (cached) return apiSuccess(cached, undefined, 200)
    }

    const result = await parseProductUrl(body.url)

    // Dịch tên (dùng specs gốc tiếng Nhật để trích cấu trúc), RỒI dịch thông số sang tiếng Việt để hiển thị
    if (result.productName) {
      result.productNameVi = await translateProductName(result.productName, result.specifications ?? [])
    }
    if (result.specifications?.length) {
      result.specifications = await translateSpecs(result.specifications)
    }
    // Dịch tên màu biến thể sang tiếng Việt
    if (result.colorVariants?.length) {
      const tr = await translateSpecs(result.colorVariants.map((c) => ({ label: '', value: c.name })))
      result.colorVariants = result.colorVariants.map((c, i) => ({ ...c, name: tr[i]?.value || c.name }))
    }

    // Bỏ rawHtml (nặng) trước khi cache; chỉ cache khi parse có nội dung hữu ích
    const { rawHtml: _rawHtml, ...cacheable } = result
    if (result.productName) {
      await setCached(cacheKey, cacheable, PARSE_CACHE_TTL)
    }

    return apiSuccess(result, undefined, 200)
  } catch (err) {
    return handleApiError(err)
  }
}
