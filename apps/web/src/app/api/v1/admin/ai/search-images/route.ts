import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, handleApiError } from '@/lib/api-response'
import { NextResponse } from 'next/server'

export const maxDuration = 20

type FoundImage = { url: string; thumbnail: string; title: string; width: number; height: number }

// Tìm thêm ảnh qua Google Custom Search (searchType=image, SafeSearch=active)
export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return apiError('Unauthorized', 401)
  }

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX
  if (!apiKey || !cx) {
    return apiError('Chưa cấu hình GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX', 400)
  }

  try {
    const { query } = await req.json()
    const q = (query ?? '').toString().trim().slice(0, 120)
    if (!q) return apiError('Thiếu từ khóa tìm ảnh', 400)

    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('cx', cx)
    url.searchParams.set('q', q)
    url.searchParams.set('searchType', 'image')
    url.searchParams.set('safe', 'active') // lọc ảnh nhạy cảm
    url.searchParams.set('num', '10')
    url.searchParams.set('imgSize', 'large')

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const data = await res.json()
    if (data.error) {
      return apiError(data.error.message ?? 'Lỗi Google Search', 502)
    }

    const seen = new Set<string>()
    const images: FoundImage[] = []
    for (const item of (data.items ?? [])) {
      const link: string = item.link ?? ''
      if (!link || seen.has(link)) continue
      if (!/^https?:\/\//i.test(link)) continue
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(link)) continue
      const w = item.image?.width ?? 0
      const h = item.image?.height ?? 0
      if (w && h && (w < 300 || h < 300)) continue // bỏ ảnh quá nhỏ
      seen.add(link)
      images.push({
        url: link,
        thumbnail: item.image?.thumbnailLink ?? link,
        title: item.title ?? '',
        width: w,
        height: h,
      })
    }

    return NextResponse.json({ success: true, images })
  } catch (err) {
    return handleApiError(err)
  }
}
