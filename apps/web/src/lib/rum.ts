// Real User Monitoring — Core Web Vitals thu từ trình duyệt khách thật.
// Dùng chung giữa API thu thập (/api/v1/vitals) và trang xem (/admin/performance).

export const RUM_KEY = 'rum:samples'
export const RUM_CAP = 10000 // giữ 10k mẫu mới nhất (đủ tính p75 ổn định)

export const RUM_METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const
export type RumMetric = (typeof RUM_METRICS)[number]

// Ngưỡng Google: [good ≤, needs-improvement ≤]. Vượt mức 2 = poor. CLS không đơn vị, còn lại ms.
export const RUM_THRESHOLDS: Record<RumMetric, { good: number; ni: number; unit: 'ms' | '' }> = {
  LCP:  { good: 2500, ni: 4000, unit: 'ms' },
  INP:  { good: 200,  ni: 500,  unit: 'ms' },
  CLS:  { good: 0.1,  ni: 0.25, unit: '' },
  FCP:  { good: 1800, ni: 3000, unit: 'ms' },
  TTFB: { good: 800,  ni: 1800, unit: 'ms' },
}

export function ratingOf(metric: RumMetric, value: number): 'good' | 'ni' | 'poor' {
  const t = RUM_THRESHOLDS[metric]
  if (value <= t.good) return 'good'
  if (value <= t.ni) return 'ni'
  return 'poor'
}

// Mẫu lưu nén (key ngắn để tiết kiệm dung lượng Redis).
export type RumSampleRaw = {
  m: RumMetric          // metric
  v: number             // value
  p: string             // path (route đã chuẩn hoá)
  d: 'mobile' | 'desktop' | 'tablet'
  b: string             // browser
  c: string             // country (ISO-2)
  n: string             // connection effectiveType (4g/3g/...)
  t: number             // timestamp (ms)
}

// Gộp segment động (slug/uuid) về pattern để tránh nổ cardinality route.
const DYNAMIC_PREFIXES = ['san-pham', 'blog', 'danh-muc', 'dau-gia', 'mua-ho']
export function normalizePath(raw: string): string {
  let p = (raw || '/').split('?')[0]!.split('#')[0]!
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  const seg = p.split('/').filter(Boolean)
  if (seg.length >= 2 && DYNAMIC_PREFIXES.includes(seg[0]!)) {
    return `/${seg[0]}/[slug]`
  }
  return p.slice(0, 120) || '/'
}

export function parseDevice(ua: string): 'mobile' | 'desktop' | 'tablet' {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet'
  if (/Mobi|Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome'
  if (/CriOS/i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua)) return 'Safari'
  return 'Other'
}

// p75 = phân vị 75 (chỉ số chuẩn Google đánh giá CWV "field").
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]!
}

export function fmtMetric(metric: RumMetric, value: number): string {
  if (metric === 'CLS') return value.toFixed(3)
  if (value >= 1000) return (value / 1000).toFixed(2) + ' s'
  return Math.round(value) + ' ms'
}
