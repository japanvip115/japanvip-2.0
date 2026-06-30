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

// CÁCH 1 (ưu tiên): fetch HTML thường + regex lấy URL ảnh — nhanh, ổn định, KHÔNG cần Chrome.
// Đa số trang hãng (Tiger, Zojirushi…) để URL ảnh feature thẳng trong HTML/CSS.
const JUNK_FEATURE = /(logo|icon|sprite|nav|header|footer|btn|arrow|bullet|avatar|placeholder|loading|spacer|blank|banner|bnr[-_]|\/parts\/|\/present\/|sheettype|balloon|ogp|awards?|kadenhihyo|ranking|seal|mark|share|sns|qr|favicon|thumb)/i
async function htmlFetchImages(target: string): Promise<string[]> {
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.5' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const origin = new URL(target)
    const found = new Set<string>()
    const push = (u?: string) => {
      if (!u) return
      let abs = u
      if (u.startsWith('//')) abs = origin.protocol + u
      else if (u.startsWith('/')) abs = `${origin.protocol}//${origin.host}${u}`
      else if (!u.startsWith('http')) return
      found.add(abs)
    }
    for (const m of html.matchAll(/(?:src|data-src|data-original|data-lazy|content)=["']([^"']+\.(?:jpg|jpeg|png|webp))(?:\?[^"']*)?["']/gi)) push(m[1])
    for (const m of html.matchAll(/url\(\s*["']?([^"')]+\.(?:jpg|jpeg|png|webp))(?:\?[^"')]*)?["']?\s*\)/gi)) push(m[1])
    let imgs = [...found].filter(u => !JUNK_FEATURE.test(u))
    // Bỏ bản _sp (mobile) khi đã có bản _pc tương ứng (tránh trùng)
    imgs = imgs.filter(u => !/_sp\.(jpg|jpeg|png|webp)/i.test(u) || !imgs.some(o => o === u.replace(/_sp\./i, '_pc.')))
    return imgs.slice(0, 20)
  } catch { return [] }
}

// 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
// Lấy ảnh giới thiệu tính năng từ TRANG CHÍNH HÃNG. Ưu tiên fetch HTML; fallback Playwright + Chrome local.
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

    // CÁCH 1: fetch HTML thường (không Chrome) — đủ dùng cho phần lớn trang hãng
    const htmlImgs = await htmlFetchImages(target)
    if (htmlImgs.length >= 3) {
      return apiSuccess({ images: htmlImgs, count: htmlImgs.length, source: 'html' }, `Lấy được ${htmlImgs.length} ảnh từ trang hãng`)
    }

    // CÁCH 2 (fallback): Playwright + Chrome local cho trang render JS hoàn toàn
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
    // 'domcontentloaded' (KHÔNG 'networkidle') — trang hãng JP nhiều tracker/analytics khiến
    // 'networkidle' không bao giờ rảnh → treo hết timeout → đứt kết nối. domcontentloaded nhanh & ổn định.
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25000 })
    } catch {
      // goto timeout → vẫn thử đọc ảnh đã tải được (không bỏ cuộc)
    }
    await page.waitForTimeout(1500)
    // Cuộn hết trang để kích lazy-load mọi ảnh tính năng
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 150))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(1000)

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
