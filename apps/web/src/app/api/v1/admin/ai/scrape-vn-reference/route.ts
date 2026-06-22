import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'

export const maxDuration = 30

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function isSafeUrl(raw: string): boolean {
  try {
    const p = new URL(raw)
    if (!['http:', 'https:'].includes(p.protocol)) return false
    const h = p.hostname.toLowerCase()
    return !/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(h)
  } catch { return false }
}

// Lấy NỘI DUNG + BẢNG THÔNG SỐ tiếng Việt từ trang bán/review tại VN (viết kỹ hơn trang Nhật)
// để nạp vào AI làm tư liệu tham khảo. Trang VN thường không chặn bot → fetch tĩnh.
export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { url } = await req.json()
    const target = (url ?? '').toString().trim()
    if (!isSafeUrl(target)) return apiError('URL không hợp lệ', 400)

    const res = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.9', 'Accept-Language': 'vi,en;q=0.5' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return apiError(`Không tải được trang (HTTP ${res.status})`, 502)

    const $ = cheerio.load(await res.text())
    $('script, style, nav, header, footer, noscript, iframe, .menu, .breadcrumb, .related, .comment, .review-form').remove()

    const title = $('title').first().text().trim().slice(0, 200)

    // Bảng thông số — gom mọi table key-value, bỏ dòng có sao đánh giá / bảng so sánh
    const specs: Array<{ name: string; value: string }> = []
    const seen = new Set<string>()
    $('table tr').each((_, tr) => {
      const cells = $(tr).find('th, td').map((_, c) => $(c).text().replace(/\s+/g, ' ').trim()).get()
      if (cells.length < 2) return
      const name = (cells[0] ?? '').trim()
      const value = cells.slice(1).join(' ').replace(/\s+/g, ' ').trim()
      if (!name || !value || name.length > 60 || value.length > 300) return
      if (/[⭐★]/.test(value) || /^(model|sản phẩm|chức năng)$/i.test(name)) return // bỏ dòng bảng so sánh
      if (seen.has(name)) return
      seen.add(name)
      specs.push({ name, value })
    })

    // Nội dung chính — chọn vùng có nhiều chữ nhất trong các container nội dung phổ biến
    let content = ''
    for (const sel of ['.product-detail', '.product-content', '.product-description', '.description', '.entry-content', '.post-content', 'article', '.content', '#content', 'main']) {
      const t = $(sel).text().replace(/\s+/g, ' ').trim()
      if (t.length > content.length) content = t
    }
    if (content.length < 200) content = $('body').text().replace(/\s+/g, ' ').trim()
    content = content.slice(0, 6000)

    if (specs.length === 0 && content.length < 200) {
      return apiError('Không trích được nội dung từ trang này', 422)
    }

    return apiSuccess({ title, content, specs }, `Lấy ${specs.length} thông số + ${content.length} ký tự nội dung`)
  } catch (err) {
    return handleApiError(err)
  }
}
