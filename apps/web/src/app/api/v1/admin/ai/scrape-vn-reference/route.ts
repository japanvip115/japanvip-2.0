import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { crawlPage, isCrawlerUp } from '@/lib/crawler'

export const maxDuration = 60

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const JUNK_IMG = /(logo|icon|sprite|banner|avatar|placeholder|thumb|loading|flag|payment|zalo|facebook|qr|button)/i

function isSafeUrl(raw: string): boolean {
  try {
    const p = new URL(raw)
    if (!['http:', 'https:'].includes(p.protocol)) return false
    const h = p.hostname.toLowerCase()
    return !/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(h)
  } catch { return false }
}

// Kết hợp: trang JS-render / chặn bot / fetch tĩnh trích được ít → bù bằng Crawl4AI (markdown + ảnh).
async function crawlerFallback(target: string): Promise<{ title: string; content: string; images: string[] } | null> {
  try {
    if (!(await isCrawlerUp())) return null
    const r = await crawlPage(target, { maxImages: 40, minWidth: 300 })
    const seen = new Set<string>()
    const images = r.images
      .map((i) => i.url)
      .filter((u) => u && /\.(jpe?g|png|webp)(\?|$)/i.test(u) && !JUNK_IMG.test(u))
      .map((u) => u.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)(\?|$)/i, '$1$2'))
      .filter((u) => { if (seen.has(u)) return false; seen.add(u); return true })
      .slice(0, 15)
    const content = (r.markdown || '').trim().slice(0, 6000)
    if (!content && images.length === 0) return null
    return { title: r.title || '', content, images }
  } catch { return null }
}

// 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
// Lấy NỘI DUNG + BẢNG THÔNG SỐ + ảnh ngữ cảnh tiếng Việt từ trang bán/review tại VN (viết kỹ hơn trang Nhật)
// để nạp vào AI làm tư liệu tham khảo. Trang VN thường không chặn bot → fetch tĩnh.
export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) return apiError('Unauthorized', 401)

  try {
    const { url } = await req.json()
    const target = (url ?? '').toString().trim()
    if (!isSafeUrl(target)) return apiError('URL không hợp lệ', 400)

    const res = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.9', 'Accept-Language': 'vi,en;q=0.5' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const fb = await crawlerFallback(target)
      if (fb) return apiSuccess({ title: fb.title, content: fb.content, specs: [], images: fb.images }, `Crawl4AI: ${fb.content.length} ký tự + ${fb.images.length} ảnh`)
      return apiError(`Không tải được trang (HTTP ${res.status})`, 502)
    }

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

    // Ảnh ngữ cảnh từ bài viết VN (lifestyle/chi tiết) — lọc rác theo URL, dedup biến thể size WordPress.
    // LƯU Ý: logo/watermark in chìm trong pixel KHÔNG nhận diện được — admin tự nhìn chọn ảnh sạch.
    const base = new URL(target)
    const resolveUrl = (s: string): string => {
      if (!s) return ''
      if (s.startsWith('http')) return s
      if (s.startsWith('//')) return base.protocol + s
      if (s.startsWith('/')) return `${base.protocol}//${base.host}${s}`
      return ''
    }
    let $content: cheerio.Cheerio<never> | null = null
    let maxLen = 0
    for (const sel of ['.product-detail', '.product-content', '.product-description', '.description', '.entry-content', '.post-content', 'article', '.content', '#content', 'main']) {
      const el = $(sel).first()
      const len = el.text().length
      if (len > maxLen) { maxLen = len; $content = el as unknown as cheerio.Cheerio<never> }
    }
    const seenImg = new Set<string>()
    const images: string[] = []
    ;($content ?? $('body')).find('img').each((_, el) => {
      const s = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src') || ''
      let r = resolveUrl(s)
      if (!r || !/\.(jpe?g|png|webp)(\?|$)/i.test(r)) return
      if (/(logo|icon|sprite|banner|avatar|placeholder|thumb|loading|flag|payment|zalo|facebook|qr|button)/i.test(r)) return
      r = r.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)(\?|$)/i, '$1$2') // bỏ hậu tố size → bản full
      if (seenImg.has(r)) return
      seenImg.add(r)
      images.push(r)
    })
    const cleanImages = images.slice(0, 15)

    // Kết hợp: fetch tĩnh trích được ít (trang JS-render) hoặc thiếu ảnh → bù bằng Crawl4AI
    let finalTitle = title
    let finalContent = content
    const finalImages = cleanImages
    const weak = (content.length < 400 && specs.length === 0) || cleanImages.length < 2
    if (weak) {
      const fb = await crawlerFallback(target)
      if (fb) {
        if (fb.content.length > finalContent.length) finalContent = fb.content
        if (!finalTitle && fb.title) finalTitle = fb.title
        const seen2 = new Set(finalImages)
        for (const u of fb.images) {
          if (!seen2.has(u)) { finalImages.push(u); seen2.add(u) }
          if (finalImages.length >= 15) break
        }
      }
    }

    if (specs.length === 0 && finalContent.length < 200 && finalImages.length === 0) {
      return apiError('Không trích được nội dung từ trang này', 422)
    }

    return apiSuccess({ title: finalTitle, content: finalContent, specs, images: finalImages }, `Lấy ${specs.length} thông số + ${finalContent.length} ký tự + ${finalImages.length} ảnh ngữ cảnh`)
  } catch (err) {
    return handleApiError(err)
  }
}
