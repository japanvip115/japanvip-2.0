'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Link2, Check, Search, LineChart, Zap } from 'lucide-react'
import PriceChart from './price-chart'

interface Flag { level: string; code: string; message: string }
interface Row {
  id: string
  name: string
  yourPrice: number | null
  anchor: number | null
  anchorUrl: string | null
  suggested: number | null
  diffFromAnchor: number | null
  japanVnd: number | null
  japanJpy: number | null
  importMarkupPct: number | null
  refMin: number | null
  refMedian: number | null
  refMax: number | null
  refCount: number
  flags: Flag[]
}

const vnd = (n: number | null) => (n == null ? '—' : n.toLocaleString('vi-VN') + 'đ')
// Gọn: 76.600.000 → "76.6tr", 850.000 → "850k"
const compactVnd = (n: number | null) => {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e6) { const m = a / 1e6; return sign + (Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '')) + 'tr' }
  if (a >= 1e3) return sign + Math.round(a / 1e3) + 'k'
  return sign + a
}
const pct = (n: number | null) => (n == null ? '—' : (n >= 0 ? '+' : '') + Math.round(n) + '%')

const REF_SOURCES = ['congnghenhat', 'hangnhat123', 'hiephongjapan', 'phongcachnhat'] as const
type Series = { source: string; points: { t: string; price: number }[] }

export default function PricingClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [chartOpen, setChartOpen] = useState<string | null>(null)
  const [charts, setCharts] = useState<Record<string, Series[]>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (flaggedOnly) params.set('flaggedOnly', '1')
    const res = await fetch(`/api/v1/admin/pricing/comparison?${params}`)
    const json = await res.json()
    if (json.success) setRows(json.data)
    setLoading(false)
  }, [q, flaggedOnly])

  useEffect(() => { load() }, [load])

  async function linkSource(productId: string, source: string, url: string) {
    if (!url) return
    setBusy(productId + source)
    setMsg('')
    const res = await fetch('/api/v1/admin/pricing/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, source, url }),
    })
    const json = await res.json()
    setBusy(null)
    if (json.success) { setMsg('✅ Đã lấy giá'); load() }
    else setMsg('❌ ' + (json.error || 'Lỗi'))
  }

  async function applyPrice(productId: string, price: number | null) {
    if (price == null) return
    if (!confirm(`Áp giá bán ${vnd(price)} cho sản phẩm này?`)) return
    setBusy(productId + 'apply')
    const res = await fetch('/api/v1/admin/pricing/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, price }),
    })
    const json = await res.json()
    setBusy(null)
    if (json.success) { setMsg('✅ Đã áp giá'); load() }
    else setMsg('❌ ' + (json.error || 'Lỗi'))
  }

  async function autoMatch() {
    if (!confirm('Tự động khớp tất cả sản phẩm với shopnoidianhat theo model (qua sitemap) và lấy giá?')) return
    setBusy('automatch')
    setMsg('⏳ Đang khớp + lấy giá…')
    const res = await fetch('/api/v1/admin/pricing/auto-match', { method: 'POST' })
    const json = await res.json()
    setBusy(null)
    if (json.success) {
      const d = json.data
      setMsg(`✅ Khớp ${d.matched} SP · lấy giá ${d.priced}${d.pending ? ` · ${d.pending} chờ cron` : ''} · ${d.unmatched} chưa khớp (dán tay)`)
      load()
    } else setMsg('❌ ' + (json.error || 'Lỗi'))
  }

  async function kakakuMatch() {
    if (!confirm('Cào giá Nhật (kakaku) cho ~12 SP? Chỉ chạy khi đang bật dev LOCAL (Vercel không có Chrome).')) return
    setBusy('kakaku')
    setMsg('⏳ Đang cào giá Nhật (Playwright, hơi chậm)…')
    const res = await fetch('/api/v1/admin/pricing/kakaku-match', { method: 'POST' })
    const json = await res.json()
    setBusy(null)
    if (json.success) { setMsg(`✅ ${json.message}`); load() }
    else setMsg('❌ ' + (json.error || 'Lỗi') + (res.status === 503 ? ' (chạy trên máy local có Chrome)' : ''))
  }

  async function toggleChart(productId: string) {
    if (chartOpen === productId) { setChartOpen(null); return }
    setChartOpen(productId)
    if (!charts[productId]) {
      const res = await fetch(`/api/v1/admin/pricing/history?productId=${productId}`)
      const json = await res.json()
      if (json.success) setCharts((c) => ({ ...c, [productId]: json.data }))
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm sản phẩm…"
            className="w-64 rounded-lg border border-gray-700 bg-gray-800 py-2 pl-8 pr-3 text-sm text-white placeholder-gray-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Chỉ hiện cảnh báo
        </label>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">
          <RefreshCw className="h-4 w-4" /> Tải lại
        </button>
        <button onClick={autoMatch} disabled={busy === 'automatch'} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
          <Zap className="h-4 w-4" /> Cào giá tự động
        </button>
        <button onClick={kakakuMatch} disabled={busy === 'kakaku'} title="Cào giá Nhật kakaku — chỉ chạy khi bật dev LOCAL" className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
          <Zap className="h-4 w-4" /> Cào giá Nhật (local)
        </button>
        {msg && <span className="text-sm text-gray-300">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60 text-left">
            <tr className="border-b border-gray-700">
              {['Sản phẩm', 'Giá bạn', 'shopnoidianhat (mốc)', 'Chênh mốc', 'Giá Nhật (kakaku)', 'Chênh NK', '4 trang khác', 'Đề xuất', ''].map((h) => (
                <th key={h} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">Chưa có sản phẩm.</td></tr>}
            {rows.map((r) => {
              const red = r.flags.find((f) => f.level === 'red')
              const orange = r.flags.find((f) => f.level === 'orange')
              const diffColor = r.diffFromAnchor == null ? 'text-gray-500'
                : red ? 'text-red-400' : orange ? 'text-orange-400' : 'text-green-400'
              return (
                <tr key={r.id} className="border-b border-gray-800 align-top">
                  <td className="max-w-xs px-3 py-3 text-gray-200">
                    <div className="line-clamp-2">{r.name}</div>
                    <div className="mt-1 flex items-center gap-3">
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                        <Link2 className="h-3 w-3" /> Nguồn giá
                      </button>
                      <button onClick={() => toggleChart(r.id)} className="flex items-center gap-1 text-xs text-purple-400 hover:underline">
                        <LineChart className="h-3 w-3" /> Xu hướng
                      </button>
                    </div>
                    {expanded === r.id && (
                      <div className="mt-2 space-y-2 rounded-lg bg-gray-900/70 p-2">
                        <SourceInput label="shopnoidianhat (mốc)" busy={busy === r.id + 'shopnoidianhat'} defaultUrl={r.anchorUrl ?? ''} onSubmit={(url) => linkSource(r.id, 'shopnoidianhat', url)} />
                        <SourceInput label="kakaku (giá Nhật)" busy={busy === r.id + 'kakaku'} defaultUrl="" onSubmit={(url) => linkSource(r.id, 'kakaku', url)} />
                        <div className="border-t border-gray-800 pt-1 text-[10px] uppercase text-gray-600">4 trang tham khảo</div>
                        {REF_SOURCES.map((s) => (
                          <SourceInput key={s} label={s} busy={busy === r.id + s} defaultUrl="" onSubmit={(url) => linkSource(r.id, s, url)} />
                        ))}
                      </div>
                    )}
                    {chartOpen === r.id && (
                      <div className="mt-2 rounded-lg bg-gray-900/70 p-2">
                        {charts[r.id] ? <PriceChart series={charts[r.id]!} /> : <div className="py-3 text-center text-xs text-gray-500">Đang tải…</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium text-white">{compactVnd(r.yourPrice)}</td>
                  <td className="px-3 py-3 text-gray-200">{compactVnd(r.anchor)}</td>
                  <td className={`px-3 py-3 font-medium ${diffColor}`}>
                    {r.diffFromAnchor == null ? '—' : (r.diffFromAnchor >= 0 ? '+' : '') + compactVnd(r.diffFromAnchor)}
                    {(red || orange) && <div className="mt-0.5 text-[11px] font-normal text-gray-400">{(red || orange)!.message}</div>}
                  </td>
                  <td className="px-3 py-3 text-gray-400">{compactVnd(r.japanVnd)}</td>
                  <td className="px-3 py-3 text-gray-400">{pct(r.importMarkupPct)}</td>
                  <td className="px-3 py-3 text-gray-400">
                    {r.refCount ? <span>{compactVnd(r.refMin)} / <b className="text-gray-300">{compactVnd(r.refMedian)}</b> / {compactVnd(r.refMax)} <span className="text-gray-600">({r.refCount})</span></span> : '—'}
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-400">{compactVnd(r.suggested)}</td>
                  <td className="px-3 py-3">
                    {r.suggested != null && (
                      <button
                        disabled={busy === r.id + 'apply'}
                        onClick={() => applyPrice(r.id, r.suggested)}
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Áp dụng
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SourceInput({ label, defaultUrl, busy, onSubmit }: { label: string; defaultUrl: string; busy: boolean; onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState(defaultUrl)
  return (
    <div>
      <div className="mb-1 text-[11px] text-gray-500">{label}</div>
      <div className="flex gap-1.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán link…"
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-600"
        />
        <button
          disabled={busy || !url}
          onClick={() => onSubmit(url)}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? '…' : 'Lấy giá'}
        </button>
      </div>
    </div>
  )
}
