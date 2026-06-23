import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, handleApiError } from '@/lib/api-response'
import { NextResponse } from 'next/server'

export const maxDuration = 20

type FoundImage = { url: string; thumbnail: string; title: string; width: number; height: number }

// Tìm thêm ảnh — ưu tiên Exa (không cần bật API Google), fallback Google Custom Search
export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return apiError('Unauthorized', 401)
  }

  const exaKey = process.env.EXA_API_KEY
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY
  const googleCx = process.env.GOOGLE_SEARCH_CX
  if (!exaKey && !(googleKey && googleCx)) {
    return apiError('Chưa cấu hình EXA_API_KEY (hoặc GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX)', 400)
  }

  try {
    const { query } = await req.json()
    const q = (query ?? '').toString().trim().slice(0, 120)
    if (!q) return apiError('Thiếu từ khóa tìm ảnh', 400)

    const images = exaKey ? await searchExa(q, exaKey) : await searchGoogle(q, googleKey!, googleCx!)
    return NextResponse.json({ success: true, images, provider: exaKey ? 'exa' : 'google' })
  } catch (err) {
    return handleApiError(err)
  }
}

// Exa REST: mỗi kết quả trả ảnh đại diện (og:image) + danh sách ảnh trên trang
// (extras.imageLinks) → gom được nhiều ảnh sản phẩm thật mỗi lần tìm.
async function searchExa(q: string, key: string): Promise<FoundImage[]> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({
      query: `${q} hình ảnh sản phẩm`,
      numResults: 12,
      type: 'auto',
      contents: { text: false, extras: { imageLinks: 5 } },
    }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error ?? data.message ?? `Lỗi Exa (${res.status})`)
  }

  const seen = new Set<string>()
  const images: FoundImage[] = []
  for (const item of (data.results ?? [])) {
    const title: string = item.title ?? ''
    const candidates: string[] = [item.image, ...(item.extras?.imageLinks ?? [])].filter(Boolean)
    for (const link of candidates) {
      if (!link || !/^https:\/\//i.test(link)) continue
      if (isJunkImage(link)) continue
      // Gộp biến thể size WordPress (…-800x720.jpg → …jpg) để khỏi lặp cùng 1 ảnh
      const dedupKey = link.replace(/-\d{2,4}x\d{2,4}(?=\.\w+)/i, '').split('?')[0]!
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)
      images.push({ url: link, thumbnail: link, title, width: 0, height: 0 })
    }
  }
  return images
}

// Loại ảnh rác: vector, icon/nút, placeholder no_image, logo, sprite, avatar…
function isJunkImage(url: string): boolean {
  if (/\.(svg|gif)(\?|$)/i.test(url)) return true
  return /(no[_-]?image|placeholder|sprite|favicon|\/btn_|button|\/icons?\/|spacer|blank\.|1x1|admin-ajax|loading|avatar|logo|thumb_overlay)/i.test(url)
}

// Google Custom Search (searchType=image) — cần bật Custom Search JSON API
async function searchGoogle(q: string, apiKey: string, cx: string): Promise<FoundImage[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', cx)
  url.searchParams.set('q', q)
  url.searchParams.set('searchType', 'image')
  url.searchParams.set('safe', 'active')
  url.searchParams.set('num', '10')
  url.searchParams.set('imgSize', 'large')

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? 'Lỗi Google Search')

  const seen = new Set<string>()
  const images: FoundImage[] = []
  for (const item of (data.items ?? [])) {
    const link: string = item.link ?? ''
    if (!link || seen.has(link)) continue
    if (!/^https?:\/\//i.test(link)) continue
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(link)) continue
    const w = item.image?.width ?? 0
    const h = item.image?.height ?? 0
    if (w && h && (w < 300 || h < 300)) continue
    seen.add(link)
    images.push({ url: link, thumbnail: item.image?.thumbnailLink ?? link, title: item.title ?? '', width: w, height: h })
  }
  return images
}
