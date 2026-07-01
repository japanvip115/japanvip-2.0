// Tự khớp SP JapanVip ↔ SP shopnoidianhat theo model number nằm trong tên/slug.

// Chuẩn hoá: bỏ mọi ký tự không phải chữ/số, viết HOA. "BD-SX130ML-W" → "BDSX130MLW".
export function norm(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

// Trích các "model token" đặc trưng từ tên SP (token có cả chữ + số, đủ dài để không nhiễu).
export function extractModels(name: string): string[] {
  const seen = new Set<string>()
  for (const raw of name.split(/[\s/,()[\]]+/)) {
    const t = norm(raw)
    if (t.length >= 5 && /[a-z]/i.test(t) && /\d/.test(t)) seen.add(t)
  }
  // ưu tiên token dài (đặc trưng hơn) trước
  return [...seen].sort((a, b) => b.length - a.length)
}

// Tìm URL trong catalog (đã chuẩn hoá slug) khớp model của SP. Ưu tiên model dài nhất.
export function matchUrl(name: string, catalog: { url: string; norm: string }[]): string | null {
  for (const m of extractModels(name)) {
    const hit = catalog.find((c) => c.norm.includes(m))
    if (hit) return hit.url
  }
  return null
}

// Chạy fn cho từng item với tối đa `limit` luồng đồng thời (tránh timeout + quá tải nguồn).
export async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<unknown>): Promise<void> {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx]!)
    }
  })
  await Promise.all(workers)
}
