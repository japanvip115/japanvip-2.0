import { redisLRange } from '@/lib/redis'
import {
  RUM_KEY, RUM_METRICS, RUM_THRESHOLDS, ratingOf, percentile, fmtMetric,
  type RumMetric, type RumSampleRaw,
} from '@/lib/rum'

export const metadata = { title: 'Hiệu Năng Người Dùng Thật | Admin Japan VIP' }
export const dynamic = 'force-dynamic'

const RATING_CLS = {
  good: 'text-green-400',
  ni: 'text-amber-400',
  poor: 'text-red-400',
} as const

function p75Cell(metric: RumMetric, values: number[]) {
  if (values.length === 0) return <span className="text-gray-600">—</span>
  const v = percentile(values, 75)
  return <span className={RATING_CLS[ratingOf(metric, v)]}>{fmtMetric(metric, v)}</span>
}

function groupP75(samples: RumSampleRaw[], metric: RumMetric, keyFn: (s: RumSampleRaw) => string, topN = 8) {
  const groups = new Map<string, number[]>()
  for (const s of samples) {
    if (s.m !== metric) continue
    const k = keyFn(s) || '—'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s.v)
  }
  return [...groups.entries()]
    .map(([k, vals]) => ({ k, p75: percentile(vals, 75), n: vals.length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, topN)
}

export default async function PerformancePage() {
  const raw = await redisLRange(RUM_KEY, 0, -1)
  const samples: RumSampleRaw[] = raw
    .map((r) => { try { return JSON.parse(r) as RumSampleRaw } catch { return null } })
    .filter((s): s is RumSampleRaw => !!s && RUM_METRICS.includes(s.m))

  const total = samples.length
  const oldest = total ? Math.min(...samples.map((s) => s.t)) : 0
  const newest = total ? Math.max(...samples.map((s) => s.t)) : 0
  const dayMs = 86_400_000
  const spanDays = total ? Math.max(1, Math.round((newest - oldest) / dayMs)) : 0

  const byDevice = (metric: RumMetric, device: string) =>
    samples.filter((s) => s.m === metric && s.d === device).map((s) => s.v)
  const allOf = (metric: RumMetric) => samples.filter((s) => s.m === metric).map((s) => s.v)

  if (total === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-2">Hiệu Năng Người Dùng Thật</h1>
        <p className="text-gray-400">Chưa có dữ liệu. Số liệu Core Web Vitals sẽ xuất hiện khi khách thật truy cập website (cần vài lượt truy cập đầu tiên — không tính máy local).</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Hiệu Năng Người Dùng Thật (Core Web Vitals)</h1>
        <p className="mt-1 text-sm text-gray-400">
          p75 = phân vị 75 (chỉ số Google dùng đánh giá). <span className="text-green-400">●</span> Tốt
          {' '}<span className="text-amber-400">●</span> Cần cải thiện <span className="text-red-400">●</span> Kém.
          {' '}Dữ liệu: <b className="text-white">{total.toLocaleString('vi')}</b> mẫu trong ~{spanDays} ngày.
        </p>
      </div>

      {/* Tổng quan p75 theo thiết bị */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">Tổng quan — p75 theo thiết bị</h2>
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Chỉ số</th>
                <th className="px-4 py-2.5 text-right font-medium">📱 Mobile</th>
                <th className="px-4 py-2.5 text-right font-medium">💻 Desktop</th>
                <th className="px-4 py-2.5 text-right font-medium">Tất cả</th>
                <th className="px-4 py-2.5 text-right font-medium">Ngưỡng tốt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {RUM_METRICS.map((m) => {
                const t = RUM_THRESHOLDS[m]
                return (
                  <tr key={m} className="bg-gray-950/40">
                    <td className="px-4 py-2.5 font-mono font-semibold text-white">{m}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{p75Cell(m, byDevice(m, 'mobile'))}</td>
                    <td className="px-4 py-2.5 text-right">{p75Cell(m, byDevice(m, 'desktop'))}</td>
                    <td className="px-4 py-2.5 text-right">{p75Cell(m, allOf(m))}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">≤ {fmtMetric(m, t.good)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Số mẫu mỗi chỉ số: {RUM_METRICS.map((m) => `${m} ${allOf(m).length}`).join(' · ')}
        </p>
      </section>

      {/* LCP + INP mobile theo route — cơ sở quyết định tách RSC */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">Mobile theo trang (LCP &amp; INP p75)</h2>
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Trang</th>
                <th className="px-4 py-2.5 text-right font-medium">LCP p75</th>
                <th className="px-4 py-2.5 text-right font-medium">INP p75</th>
                <th className="px-4 py-2.5 text-right font-medium">Mẫu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(() => {
                const mobile = samples.filter((s) => s.d === 'mobile')
                const routes = [...new Set(mobile.map((s) => s.p))]
                  .map((p) => {
                    const lcp = mobile.filter((s) => s.p === p && s.m === 'LCP').map((s) => s.v)
                    const inp = mobile.filter((s) => s.p === p && s.m === 'INP').map((s) => s.v)
                    return { p, lcp, inp, n: lcp.length }
                  })
                  .sort((a, b) => b.n - a.n)
                  .slice(0, 12)
                return routes.map((r) => (
                  <tr key={r.p} className="bg-gray-950/40">
                    <td className="px-4 py-2.5 font-mono text-gray-300">{r.p}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{p75Cell('LCP', r.lcp)}</td>
                    <td className="px-4 py-2.5 text-right">{p75Cell('INP', r.inp)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{r.n}</td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
      </section>

      {/* Phân tách quốc gia / trình duyệt / kết nối (LCP mobile) */}
      <section className="grid gap-6 md:grid-cols-3">
        {([
          ['Quốc gia', (s: RumSampleRaw) => s.c],
          ['Trình duyệt', (s: RumSampleRaw) => s.b],
          ['Kết nối', (s: RumSampleRaw) => s.n],
        ] as const).map(([label, keyFn]) => (
          <div key={label}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{label} — LCP mobile p75</h3>
            <div className="overflow-hidden rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800">
                  {groupP75(samples.filter((s) => s.d === 'mobile'), 'LCP', keyFn).map((g) => (
                    <tr key={g.k} className="bg-gray-950/40">
                      <td className="px-3 py-2 text-gray-300">{g.k || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold">{p75Cell('LCP', samples.filter((s) => s.d === 'mobile' && s.m === 'LCP' && keyFn(s) === g.k).map((s) => s.v))}</td>
                      <td className="px-3 py-2 text-right text-gray-600 text-xs">{g.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <p className="text-xs text-gray-600">
        Cách đọc &amp; ngưỡng cảnh báo: xem <code className="text-gray-400">docs/REAL_USER_PERFORMANCE_MONITORING.md</code>.
        Theo dõi 7–14 ngày; chỉ tách RSC nếu <b className="text-gray-400">LCP p75 mobile &gt; 2.5s</b> hoặc <b className="text-gray-400">INP p75 mobile &gt; 200ms</b> với đủ mẫu (≥ vài trăm).
      </p>
    </div>
  )
}
