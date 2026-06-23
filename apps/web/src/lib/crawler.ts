/**
 * Client gọi Crawl4AI service (local) — cào trang → markdown + ảnh.
 * Service chạy riêng bằng Python: `./services/crawler/run.sh` (chỉ LOCAL).
 * Cấu hình: CRAWLER_URL (mặc định http://127.0.0.1:8787), CRAWLER_TOKEN (tùy chọn).
 */

export type CrawledImage = { url: string; alt: string; width: number; score: number }
export type CrawlResult = { success: boolean; title: string; markdown: string; images: CrawledImage[]; imageCount: number }

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://127.0.0.1:8787'
const CRAWLER_TOKEN = process.env.CRAWLER_TOKEN || ''

export function isCrawlerConfigured(): boolean {
  return !!CRAWLER_URL
}

/** Kiểm tra service có đang chạy không (timeout ngắn). */
export async function isCrawlerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${CRAWLER_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export async function crawlPage(
  url: string,
  opts: { waitFor?: string; maxImages?: number; minWidth?: number } = {}
): Promise<CrawlResult> {
  const res = await fetch(`${CRAWLER_URL}/crawl`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(CRAWLER_TOKEN ? { 'x-crawler-token': CRAWLER_TOKEN } : {}) },
    body: JSON.stringify({
      url,
      wait_for: opts.waitFor,
      max_images: opts.maxImages ?? 60,
      min_width: opts.minWidth ?? 300,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail ?? `Crawler lỗi (${res.status})`)
  }

  const data = await res.json()
  return {
    success: !!data.success,
    title: data.title ?? '',
    markdown: data.markdown ?? '',
    images: data.images ?? [],
    imageCount: data.image_count ?? (data.images?.length ?? 0),
  }
}
