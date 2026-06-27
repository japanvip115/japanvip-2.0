'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Loader2, Copy, Check, Save, Send, Trash2, AlertTriangle,
  Wand2, FileText, RefreshCw, ChevronDown,
} from 'lucide-react'
import { CONTENT_CHANNELS, channelLabel, type ChannelKey } from '@/lib/content-studio/channels'

type Product = { id: string; name: string }

type GenResult = { channel: ChannelKey; body: string; source: string; error?: string }

type Asset = {
  id: string; title: string; channel: string; body: string; status: string
  provider: string; createdAt: string
}

const GOALS = [
  { key: 'sales', label: 'Bán hàng' },
  { key: 'new_arrival', label: 'Hàng mới về' },
  { key: 'seo', label: 'Chuẩn SEO' },
  { key: 'education', label: 'Giáo dục khách' },
  { key: 'remarketing', label: 'Remarketing' },
]

const AUDIENCES = [
  'Gia đình trẻ', 'Nhà chung cư', 'Khách cao cấp',
  'Quan tâm tiết kiệm điện', 'Khách mua thiết bị TOTO', 'Khách đặt hàng từ Nhật',
]

const TONES = [
  'Chuyên nghiệp, đáng tin', 'Gần gũi, thân thiện', 'Am hiểu công nghệ', 'Sang trọng, cao cấp',
]

const LENGTHS = [
  { key: 'short', label: 'Ngắn' },
  { key: 'medium', label: 'Vừa' },
  { key: 'long', label: 'Chi tiết' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-white/10 text-slate-300' },
  AI_GENERATED: { label: 'AI tạo', cls: 'bg-purple-500/15 text-purple-300' },
  PENDING_REVIEW: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-300' },
  REVISION_REQUIRED: { label: 'Cần sửa', cls: 'bg-orange-500/15 text-orange-300' },
  APPROVED: { label: 'Đã duyệt', cls: 'bg-emerald-500/15 text-emerald-300' },
  SCHEDULED: { label: 'Đã lên lịch', cls: 'bg-blue-500/15 text-blue-300' },
  PUBLISHED: { label: 'Đã đăng', cls: 'bg-emerald-600/20 text-emerald-300' },
  REJECTED: { label: 'Từ chối', cls: 'bg-red-500/15 text-red-300' },
  ARCHIVED: { label: 'Lưu trữ', cls: 'bg-white/5 text-slate-400' },
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red'

export function StudioClient({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [topic, setTopic] = useState('')
  const [channels, setChannels] = useState<ChannelKey[]>(['FACEBOOK'])
  const [goal, setGoal] = useState('sales')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState(TONES[0])
  const [length, setLength] = useState('medium')
  const [cta, setCta] = useState('')
  const [kwPrimary, setKwPrimary] = useState('')
  const [kwSecondary, setKwSecondary] = useState('')
  const [voltageNote, setVoltageNote] = useState('')
  const [model, setModel] = useState('auto')
  const [autoSave, setAutoSave] = useState(true)

  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<GenResult[]>([])
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [savingKey, setSavingKey] = useState('')

  const [saved, setSaved] = useState<Asset[]>([])
  const [savedOpen, setSavedOpen] = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)
  const [fStatus, setFStatus] = useState('ALL')
  const [busyId, setBusyId] = useState('')

  const filteredProducts = useMemo(() => {
    const q = productFilter.trim().toLowerCase()
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
    return list.slice(0, 50)
  }, [products, productFilter])

  function toggleChannel(key: ChannelKey) {
    setChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
  }

  const grouped = useMemo(() => {
    const g: Record<string, typeof CONTENT_CHANNELS> = {}
    for (const c of CONTENT_CHANNELS) (g[c.group] ??= []).push(c)
    return g
  }, [])

  async function generate() {
    setErr('')
    if (!productId && !topic.trim()) { setErr('Chọn sản phẩm hoặc nhập chủ đề'); return }
    if (!channels.length) { setErr('Chọn ít nhất 1 kênh'); return }
    setGenerating(true)
    setResults([])
    try {
      const res = await fetch('/api/v1/admin/content/studio/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: productId || undefined,
          topic: topic.trim() || undefined,
          channels,
          goal, audience: audience || undefined, tone: tone || undefined, length,
          cta: cta.trim() || undefined,
          keywordPrimary: kwPrimary.trim() || undefined,
          keywordsSecondary: kwSecondary.trim() || undefined,
          voltageNote: voltageNote.trim() || undefined,
          model, save: autoSave,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setResults(d.data.results ?? [])
        if (autoSave) loadSaved()
      } else setErr(d.error ?? 'Không tạo được nội dung (cần Claude Code chạy local hoặc bật API key)')
    } catch { setErr('Lỗi gọi AI') }
    setGenerating(false)
  }

  function updateBody(i: number, body: string) {
    setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, body } : r)))
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500) } catch { /* ignore */ }
  }

  async function saveResult(r: GenResult, status: 'DRAFT' | 'PENDING_REVIEW') {
    setSavingKey(r.channel + status)
    try {
      const subject = products.find((p) => p.id === productId)?.name || topic.trim() || 'Nội dung'
      const res = await fetch('/api/v1/admin/content/assets', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `[${channelLabel(r.channel)}] ${subject}`.slice(0, 200),
          channel: r.channel, body: r.body, status,
          provider: r.source, sourceProductId: productId || undefined,
          sourceTopic: topic.trim() || undefined, goal,
        }),
      })
      const d = await res.json()
      if (d.success) loadSaved()
      else setErr(d.error ?? 'Lưu thất bại')
    } catch { setErr('Lỗi lưu') }
    setSavingKey('')
  }

  const loadSaved = useCallback(async () => {
    setSavedLoading(true)
    try {
      const qs = fStatus !== 'ALL' ? `?status=${fStatus}` : ''
      const res = await fetch(`/api/v1/admin/content/assets${qs}`)
      const d = await res.json()
      if (d.success) setSaved(d.data.items ?? [])
    } catch { /* ignore */ }
    setSavedLoading(false)
  }, [fStatus])

  useEffect(() => { if (savedOpen) loadSaved() }, [savedOpen, loadSaved])

  async function setAssetStatus(id: string, status: string) {
    setBusyId(id)
    await fetch(`/api/v1/admin/content/assets/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusyId(''); loadSaved()
  }

  async function deleteAsset(id: string) {
    if (!confirm('Xoá nội dung này?')) return
    setBusyId(id)
    await fetch(`/api/v1/admin/content/assets/${id}`, { method: 'DELETE' })
    setBusyId(''); loadSaved()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#1a2233] to-[#161d2b] px-6 py-5 shadow-lg">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red text-white shadow-sm">
              <Wand2 className="h-5 w-5" />
            </span>
            Content Studio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Từ 1 sản phẩm → tạo nội dung riêng cho từng kênh. Nội dung luôn ở dạng <b>nháp</b> chờ bạn duyệt — không tự đăng.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Config */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#161d2b] p-5 lg:sticky lg:top-6 lg:self-start">
          {/* Nguồn */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nguồn nội dung</label>
            <input value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              placeholder="Tìm sản phẩm…" className={inputCls} />
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
              <option value="">— Không gắn sản phẩm —</option>
              {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2}
              placeholder="Hoặc nhập chủ đề tự do (vd: mẹo chọn nồi cơm IH cho gia đình 4 người)" className={inputCls} />
          </div>

          {/* Kênh */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kênh ({channels.length})
            </label>
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="mb-1 text-[11px] text-slate-500">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((c) => {
                    const on = channels.includes(c.key)
                    return (
                      <button key={c.key} type="button" onClick={() => toggleChannel(c.key)} title={c.hint}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'bg-brand-red text-white' : 'border border-white/10 text-slate-300 hover:border-brand-red hover:text-brand-red'}`}>
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Định hướng */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Mục tiêu</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
                {GOALS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Độ dài</label>
              <select value={length} onChange={(e) => setLength(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
                {LENGTHS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Tệp khách</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
                <option value="">— Mặc định —</option>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Tông giọng</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA mong muốn (tùy chọn)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input value={kwPrimary} onChange={(e) => setKwPrimary(e.target.value)} placeholder="Từ khoá chính" className={inputCls} />
            <input value={kwSecondary} onChange={(e) => setKwSecondary(e.target.value)} placeholder="Từ khoá phụ" className={inputCls} />
          </div>
          <input value={voltageNote} onChange={(e) => setVoltageNote(e.target.value)}
            placeholder="Ghi chú điện áp (vd: Hàng nội địa Nhật 100V)" className={inputCls} />

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Model AI</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className={`${inputCls} [color-scheme:dark]`}>
              <option value="auto">⚡ Tự động (free khi chạy local)</option>
              <option value="claude-opus-4-8">💎 Opus 4.8 · API</option>
              <option value="claude-sonnet-4-6">🚀 Sonnet 4.6 · API</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="accent-brand-red" />
            Tự lưu nháp sau khi tạo
          </label>

          <button onClick={generate} disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-5 py-3 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Đang tạo…' : 'Tạo nội dung'}
          </button>
          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {generating && (
            <div className="space-y-3">
              {channels.map((c) => (
                <div key={c} className="animate-pulse rounded-2xl border border-white/10 bg-[#161d2b] p-5">
                  <div className="mb-3 h-4 w-32 rounded bg-white/10" />
                  <div className="space-y-2"><div className="h-3 w-full rounded bg-white/5" /><div className="h-3 w-5/6 rounded bg-white/5" /><div className="h-3 w-2/3 rounded bg-white/5" /></div>
                </div>
              ))}
            </div>
          )}

          {!generating && results.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#161d2b] py-20 text-center">
              <Wand2 className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">Chọn nguồn + kênh bên trái rồi bấm <b>Tạo nội dung</b>.</p>
              <p className="mt-1 text-xs text-slate-500">Mỗi kênh có văn phong riêng, kèm luật nội dung Japan VIP (cảnh báo điện áp, không phóng đại).</p>
            </div>
          )}

          {results.map((r, i) => (
            <div key={r.channel} className="rounded-2xl border border-white/10 bg-[#161d2b] p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-red/15 px-2.5 py-0.5 text-xs font-semibold text-brand-red">{channelLabel(r.channel)}</span>
                  {r.source && r.source !== 'none' && <span className="text-[11px] text-slate-500">via {r.source}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copy(r.body, r.channel)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                    {copied === r.channel ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Chép
                  </button>
                  <button onClick={() => saveResult(r, 'DRAFT')} disabled={!r.body || !!savingKey}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">
                    {savingKey === r.channel + 'DRAFT' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Lưu nháp
                  </button>
                  <button onClick={() => saveResult(r, 'PENDING_REVIEW')} disabled={!r.body || !!savingKey}
                    className="flex items-center gap-1 rounded-lg bg-amber-600/80 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                    {savingKey === r.channel + 'PENDING_REVIEW' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Gửi duyệt
                  </button>
                </div>
              </div>
              {r.error ? (
                <p className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  <AlertTriangle className="h-4 w-4" /> {r.error}
                </p>
              ) : (
                <textarea value={r.body} onChange={(e) => updateBody(i, e.target.value)} rows={Math.min(16, Math.max(5, r.body.split('\n').length + 1))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-red" />
              )}
            </div>
          ))}

          {/* Saved assets */}
          <div className="rounded-2xl border border-white/10 bg-[#161d2b]">
            <button onClick={() => setSavedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left">
              <span className="flex items-center gap-2 font-bold text-white"><FileText className="h-4 w-4" /> Nội dung đã lưu</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${savedOpen ? '' : '-rotate-90'}`} />
            </button>
            {savedOpen && (
              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {['ALL', 'AI_GENERATED', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'DRAFT'].map((s) => (
                    <button key={s} onClick={() => setFStatus(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${fStatus === s ? 'bg-brand-red text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                      {s === 'ALL' ? 'Tất cả' : (STATUS_BADGE[s]?.label ?? s)}
                    </button>
                  ))}
                  <button onClick={loadSaved} className="ml-auto rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5" title="Tải lại">
                    <RefreshCw className={`h-3.5 w-3.5 ${savedLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {savedLoading ? (
                  <div className="flex h-20 items-center justify-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : saved.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">Chưa có nội dung nào.</p>
                ) : (
                  <div className="space-y-2">
                    {saved.map((a) => {
                      const badge = STATUS_BADGE[a.status] ?? { label: a.status, cls: 'bg-white/10 text-slate-300' }
                      return (
                        <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                            <span className="text-xs text-slate-400">{channelLabel(a.channel)}</span>
                            <span className="ml-auto text-[11px] text-slate-600">{new Date(a.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-200">{a.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <button onClick={() => copy(a.body, a.id)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5">
                              {copied === a.id ? 'Đã chép' : 'Chép'}
                            </button>
                            {a.status !== 'APPROVED' && (
                              <button onClick={() => setAssetStatus(a.id, 'APPROVED')} disabled={busyId === a.id}
                                className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">Duyệt</button>
                            )}
                            {a.status !== 'PENDING_REVIEW' && a.status !== 'APPROVED' && (
                              <button onClick={() => setAssetStatus(a.id, 'PENDING_REVIEW')} disabled={busyId === a.id}
                                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">Gửi duyệt</button>
                            )}
                            <button onClick={() => deleteAsset(a.id)} disabled={busyId === a.id}
                              className="ml-auto rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Xoá">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
