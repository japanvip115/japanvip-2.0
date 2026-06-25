import { resolveEditorAuth } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { crawlPage, isCrawlerUp } from '@/lib/crawler'

export const maxDuration = 60

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const JUNK_IMG = /(logo|icon|sprite|nav|header|footer|btn|arrow|bullet|avatar|placeholder|loading|spacer|blank|banner|bnr[-_]|\/parts\/|\/present\/|sheettype|balloon)/i

function isSafeUrl(raw: string): boolean {
  try {
    const p = new URL(raw)
    if (!['http:', 'https:'].includes(p.protocol)) return false
    const h = p.hostname.toLowerCase()
    return !/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(h)
  } catch { return false }
}

// Kết hợp: lấy ảnh qua Crawl4AI service (local) khi không có Chrome / Playwright lấy được ít.
async function crawlerImages(target: string): Promise<string[]> {
  try {
    if (!(await isCrawlerUp())) return []
    const r = await crawlPage(target, { maxImages: 40, minWidth: 300 })
    const seen = new Set<string>()
    return r.images
      .map((i) => i.url)
      .filter((src) => src && src.startsWith('http') && !JUNK_IMG.test(src))
      .filter((src) => { if (seen.has(src)) return false; seen.add(src); return true })
      .slice(0, 15)
  } catch { return [] }
}

// 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
// Lấy ảnh giới thiệu tính năng từ TRANG CHÍNH HÃNG (site render JS) bằng Playwright + Chrome local.
// Chỉ chạy ở máy local có Google Chrome — trên Vercel (không có Chrome) sẽ trả lỗi 503 gọn gàng.
export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) {
    return apiError('Unauthorized', 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null
  try {
    const { url } = await req.json()
    const target = (url ?? '').toString().trim()
    if (!isSafeUrl(target)) return apiError('URL không hợp lệ', 400)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chromium: any
    try {
      ;({ chromium } = await import('playwright-core'))
    } catch {
      const imgs = await crawlerImages(target)
      if (imgs.length) return apiSuccess({ images: imgs, count: imgs.length, source: 'crawl4ai' }, `Lấy được ${imgs.length} ảnh (Crawl4AI)`)
      return apiError('Cần Google Chrome + Playwright, hoặc bật Crawl4AI service (./services/crawler/run.sh).', 503)
    }

    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      const imgs = await crawlerImages(target)
      if (imgs.length) return apiSuccess({ images: imgs, count: imgs.length, source: 'crawl4ai' }, `Lấy được ${imgs.length} ảnh (Crawl4AI)`)
      return apiError('Không mở được Chrome. Cần Google Chrome local, hoặc bật Crawl4AI service.', 503)
    }

    const context = await browser.newContext({ userAgent: UA })
    const page = await context.newPage()
    await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1200)
    // Cuộn hết trang để kích lazy-load mọi ảnh tính năng
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 150))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(800)

    const raw: Array<{ src: string; w: number; h: number }> = await page.evaluate(() => {
      const out: Array<{ src: string; w: number; h: number }> = []
      document.querySelectorAll('img').forEach((im) => {
        const el = im as HTMLImageElement
        out.push({ src: el.currentSrc || el.src, w: el.naturalWidth, h: el.naturalHeight })
      })
      return out
    })

    const seen = new Set<string>()
    const images = raw
      .filter((i) => i.src && i.src.startsWith('http') && i.w >= 300 && i.h >= 200)
      .filter((i) => !/(logo|icon|sprite|nav|header|footer|btn|arrow|bullet|avatar|placeholder|loading|spacer|blank)/i.test(i.src))
      .filter((i) => { if (seen.has(i.src)) return false; seen.add(i.src); return true })
      .sort((a, b) => b.w * b.h - a.w * a.h)
      .slice(0, 15)
      .map((i) => i.src)

    // Kết hợp: Playwright lấy được ít → bù thêm ảnh từ Crawl4AI
    let finalImages = images
    if (finalImages.length < 3) {
      const extra = await crawlerImages(target)
      const seen2 = new Set(finalImages)
      for (const e of extra) {
        if (!seen2.has(e)) { finalImages.push(e); seen2.add(e) }
        if (finalImages.length >= 15) break
      }
    }

    return apiSuccess({ images: finalImages, count: finalImages.length }, `Lấy được ${finalImages.length} ảnh từ trang hãng`)
  } catch (err) {
    return handleApiError(err)
  } finally {
    if (browser) { try { await browser.close() } catch { /* ignore */ } }
  }
}
