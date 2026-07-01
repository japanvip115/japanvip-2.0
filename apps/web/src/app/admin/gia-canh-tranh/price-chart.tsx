'use client'

interface Series { source: string; points: Array<{ t: string; price: number }> }

const COLORS: Record<string, string> = {
  shopnoidianhat: '#ef4444',
  kakaku: '#a855f7',
  congnghenhat: '#3b82f6',
  hangnhat123: '#22c55e',
  hiephongjapan: '#eab308',
  phongcachnhat: '#f97316',
}

// Biểu đồ đường tối giản bằng SVG thuần — 1 đường/nguồn theo thời gian.
export default function PriceChart({ series }: { series: Series[] }) {
  const all = series.flatMap((s) => s.points)
  if (all.length < 2) return <div className="py-4 text-center text-xs text-gray-500">Chưa đủ dữ liệu lịch sử (cần ≥2 lần cào).</div>

  const W = 560, H = 160, PAD = 8
  const times = all.map((p) => new Date(p.t).getTime())
  const prices = all.map((p) => p.price)
  const tMin = Math.min(...times), tMax = Math.max(...times)
  const pMin = Math.min(...prices), pMax = Math.max(...prices)
  const x = (t: number) => PAD + ((t - tMin) / (tMax - tMin || 1)) * (W - 2 * PAD)
  const y = (p: number) => H - PAD - ((p - pMin) / (pMax - pMin || 1)) * (H - 2 * PAD)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(new Date(p.t).getTime()).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ')
          const c = COLORS[s.source] ?? '#9ca3af'
          return (
            <g key={s.source}>
              <path d={d} fill="none" stroke={c} strokeWidth={1.75} />
              {pts.map((p, i) => <circle key={i} cx={x(new Date(p.t).getTime())} cy={y(p.price)} r={2} fill={c} />)}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {series.map((s) => (
          <span key={s.source} className="flex items-center gap-1 text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[s.source] ?? '#9ca3af' }} />
            {s.source}
          </span>
        ))}
        <span className="text-gray-600">{pMin.toLocaleString('vi-VN')}đ → {pMax.toLocaleString('vi-VN')}đ</span>
      </div>
    </div>
  )
}
