// Lấy giá thấp nhất (最安価格) từ kakaku.com bằng Playwright — giá render JS + trang Shift-JIS.
// CHỈ chạy LOCAL (cần Chrome; Vercel không có). Nhận sẵn `page` để tái dùng 1 browser cho nhiều SP.

// Search kakaku theo model → item URL → giá ¥ thấp nhất. Trả null nếu không tìm/không có giá.
export async function fetchKakakuByModel(
  page: { goto: (u: string, o?: unknown) => Promise<unknown>; $eval: (s: string, fn: (e: unknown) => unknown) => Promise<unknown>; waitForTimeout: (ms: number) => Promise<void> },
  model: string,
): Promise<{ itemUrl: string; priceJpy: number } | null> {
  try {
    await page.goto(`https://search.kakaku.com/${encodeURIComponent(model)}/`, { waitUntil: 'domcontentloaded', timeout: 25000 })
    const itemUrl = (await page.$eval('a[href*="/item/"]', (a) => (a as HTMLAnchorElement).href).catch(() => null)) as string | null
    if (!itemUrl) return null

    await page.goto(itemUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(2000)
    const text = (await page.$eval('.p-prdInfoPriceCont', (e) => (e as HTMLElement).textContent ?? '').catch(() => '')) as string

    // "最安価格 197,158円" → 197158
    const m = text.match(/([0-9][0-9,]{3,})\s*円/)
    const priceJpy = m ? parseInt(m[1]!.replace(/,/g, ''), 10) : null
    if (!priceJpy || priceJpy < 1000) return null

    return { itemUrl, priceJpy }
  } catch {
    return null
  }
}
