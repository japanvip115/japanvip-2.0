import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { parseProductUrl, validateUrl } from '@/modules/bfj/url-parser/parser.factory'
import { translateProductName } from '@/modules/bfj/services/translate.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  url: z.string().url('URL không hợp lệ'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

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

    const result = await parseProductUrl(body.url)

    // Translate product name to Vietnamese (async, non-blocking fallback)
    if (result.productName) {
      result.productNameVi = await translateProductName(result.productName)
    }

    return apiSuccess(result, undefined, 200)
  } catch (err) {
    return handleApiError(err)
  }
}
