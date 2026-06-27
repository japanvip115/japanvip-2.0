'use client'

import { useMemo, useState } from 'react'
import {
  BrainCircuit, Loader2, Sparkles, Save, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'

type Product = { id: string; name: string; status: string }
type ProfileLite = { productId: string; confidenceScore: number | null }

type Form = {
  originalSourceText: string
  translatedSummary: string
  verifiedFacts: string
  missingFields: string
  riskFlags: string
  buyerGuidance: string
  voltageGuidance: string
  transformerGuidance: string
  modelComparisonNotes: string
  internalNotes: string
  confidenceScore: string
}

const emptyForm: Form = {
  originalSourceText: '', translatedSummary: '', verifiedFacts: '', missingFields: '', riskFlags: '',
  buyerGuidance: '', voltageGuidance: '', transformerGuidance: '', modelComparisonNotes: '', internalNotes: '', confidenceScore: '',
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red'

const toLines = (a?: string[] | null) => (a ?? []).join('\n')
const toArr = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

export function ProductAiClient({ products, profiles }: { products: Product[]; profiles: ProfileLite[] }) {
  const [profiled, setProfiled] = useState<Record<string, number | null>>(
    () => Object.fromEntries(profiles.map((p) => [p.productId, p.confidenceScore])),
  )
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [model, setModel] = useState('auto')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products).slice(0, 100)
  }, [products, search])

  async function selectProduct(p: Product) {
    setSelected(p); setErr(''); setOk(''); setForm(emptyForm)
    setLoadingProfile(true)
    try {
      const res = await fetch(`/api/v1/admin/knowledge/product-profiles?productId=${p.id}`)
      const d = await res.json()
      const pf = d.success ? d.data.profile : null
      if (pf) {
        setForm({
          originalSourceText: pf.originalSourceText ?? '',
          translatedSummary: pf.translatedSummary ?? '',
          verifiedFacts: toLines(pf.verifiedFacts),
          missingFields: toLines(pf.missingFields),
          riskFlags: toLines(pf.riskFlags),
          buyerGuidance: pf.buyerGuidance ?? '',
          voltageGuidance: pf.voltageGuidance ?? '',
          transformerGuidance: pf.transformerGuidance ?? '',
          modelComparisonNotes: pf.modelComparisonNotes ?? '',
          internalNotes: pf.internalNotes ?? '',
          confidenceScore: pf.confidenceScore != null ? String(pf.confidenceScore) : '',
        })
      }
    } catch { /* ignore */ }
    setLoadingProfile(false)
  }

  async function analyze() {
    if (!selected) return
    setAnalyzing(true); setErr(''); setOk('')
    try {
      const res = await fetch('/api/v1/admin/ai/product-analysis', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: selected.id, model, originalSourceText: form.originalSourceText.trim() || undefined }),
      })
      const d = await res.json()
      if (!d.success) { setErr(d.error ?? 'Phân tích thất bại (cần Claude Code local hoặc API key)'); setAnalyzing(false); return }
      const a = d.data.analysis
      setForm((f) => ({
        ...f,
        translatedSummary: a.translatedSummary ?? '',
        verifiedFacts: toLines(a.verifiedFacts),
        missingFields: toLines(a.missingFields),
        riskFlags: toLines(a.riskFlags),
        buyerGuidance: a.buyerGuidance ?? '',
        voltageGuidance: a.voltageGuidance ?? '',
        transformerGuidance: a.transformerGuidance ?? '',
        modelComparisonNotes: a.modelComparisonNotes ?? '',
        confidenceScore: a.confidenceScore != null ? String(a.confidenceScore) : '',
      }))
      setOk(`Đã phân tích (via ${d.data.source}). Xem lại, chỉnh nếu cần rồi Lưu hồ sơ.`)
    } catch { setErr('Lỗi gọi AI') }
    setAnalyzing(false)
  }

  async function save() {
    if (!selected) return
    setSaving(true); setErr(''); setOk('')
    try {
      const res = await fetch('/api/v1/admin/knowledge/product-profiles', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: selected.id,
          originalSourceText: form.originalSourceText.trim() || null,
          translatedSummary: form.translatedSummary.trim() || null,
          verifiedFacts: toArr(form.verifiedFacts),
          missingFields: toArr(form.missingFields),
          riskFlags: toArr(form.riskFlags),
          buyerGuidance: form.buyerGuidance.trim() || null,
          voltageGuidance: form.voltageGuidance.trim() || null,
          transformerGuidance: form.transformerGuidance.trim() || null,
          modelComparisonNotes: form.modelComparisonNotes.trim() || null,
          internalNotes: form.internalNotes.trim() || null,
          confidenceScore: form.confidenceScore ? Number(form.confidenceScore) : null,
        }),
      })
      const d = await res.json()
      if (!d.success) { setErr(d.error ?? 'Lưu thất bại'); setSaving(false); return }
      setProfiled((m) => ({ ...m, [selected.id]: form.confidenceScore ? Number(form.confidenceScore) : null }))
      setOk('Đã lưu hồ sơ tri thức cho sản phẩm.')
    } catch { setErr('Lỗi lưu') }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><BrainCircuit className="h-5 w-5 text-brand-red" /> Phân tích sản phẩm AI</h1>
        <p className="mt-0.5 text-sm text-slate-500">AI dịch JP→VI, phát hiện thông tin thiếu & rủi ro (điện 100V/biến áp), gợi ý tư vấn. Bạn duyệt rồi lưu hồ sơ.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Product list */}
        <div className="space-y-2 rounded-2xl border border-white/10 bg-[#161d2b] p-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm sản phẩm…" className="flex-1 bg-transparent py-2 text-sm text-white placeholder:text-slate-500 outline-none" />
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            {filtered.map((p) => {
              const has = p.id in profiled
              const active = selected?.id === p.id
              return (
                <button key={p.id} onClick={() => selectProduct(p)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${active ? 'bg-brand-red/15 text-white ring-1 ring-inset ring-brand-red/30' : 'text-slate-300 hover:bg-white/5'}`}>
                  <span className="flex-1 truncate">{p.name}</span>
                  {has ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />{profiled[p.id] != null ? `${profiled[p.id]}%` : ''}</span>
                  ) : (
                    <span className="text-[10px] text-slate-600">chưa</span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Không có sản phẩm.</p>}
          </div>
        </div>

        {/* Analysis panel */}
        <div>
          {!selected ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#161d2b] py-24 text-center">
              <BrainCircuit className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">Chọn một sản phẩm bên trái để phân tích.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-white">{selected.name}</h2>
                  {loadingProfile && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                </div>
                <textarea value={form.originalSourceText} onChange={(e) => setForm({ ...form, originalSourceText: e.target.value })} rows={2}
                  placeholder="(Tùy chọn) Dán nội dung gốc tiếng Nhật để AI dịch chính xác hơn…" className={`${inputCls} mb-3`} />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={model} onChange={(e) => setModel(e.target.value)} className={`${inputCls} max-w-[260px] [color-scheme:dark]`}>
                    <option value="auto">⚡ Tự động (free khi chạy local)</option>
                    <option value="claude-opus-4-8">💎 Opus 4.8 · API</option>
                    <option value="claude-sonnet-4-6">🚀 Sonnet 4.6 · API</option>
                  </select>
                  <button onClick={analyze} disabled={analyzing}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Phân tích bằng AI
                  </button>
                </div>
                {ok && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> {ok}</p>}
                {err && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle className="h-4 w-4" /> {err}</p>}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161d2b] p-5">
                <Field label="Tóm tắt (tiếng Việt)">
                  <textarea value={form.translatedSummary} onChange={(e) => setForm({ ...form, translatedSummary: e.target.value })} rows={3} className={inputCls} />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Rủi ro cần kiểm tra (mỗi dòng 1 ý)">
                    <textarea value={form.riskFlags} onChange={(e) => setForm({ ...form, riskFlags: e.target.value })} rows={4} className={inputCls} placeholder="Vd: Chỉ dùng điện 100V — cần biến áp" />
                  </Field>
                  <Field label="Thông tin còn thiếu (mỗi dòng 1 ý)">
                    <textarea value={form.missingFields} onChange={(e) => setForm({ ...form, missingFields: e.target.value })} rows={4} className={inputCls} />
                  </Field>
                </div>
                <Field label="Dữ kiện đã xác minh (mỗi dòng 1 ý)">
                  <textarea value={form.verifiedFacts} onChange={(e) => setForm({ ...form, verifiedFacts: e.target.value })} rows={3} className={inputCls} />
                </Field>
                <Field label="Khuyến nghị cho khách">
                  <textarea value={form.buyerGuidance} onChange={(e) => setForm({ ...form, buyerGuidance: e.target.value })} rows={2} className={inputCls} />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Hướng dẫn điện áp tại VN">
                    <textarea value={form.voltageGuidance} onChange={(e) => setForm({ ...form, voltageGuidance: e.target.value })} rows={2} className={inputCls} />
                  </Field>
                  <Field label="Gợi ý biến áp">
                    <textarea value={form.transformerGuidance} onChange={(e) => setForm({ ...form, transformerGuidance: e.target.value })} rows={2} className={inputCls} />
                  </Field>
                </div>
                <Field label="So sánh model tương đương">
                  <textarea value={form.modelComparisonNotes} onChange={(e) => setForm({ ...form, modelComparisonNotes: e.target.value })} rows={2} className={inputCls} />
                </Field>
                <Field label="Ghi chú nội bộ (không hiển thị cho khách)">
                  <textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} className={inputCls} />
                </Field>
                <div className="flex items-center gap-3">
                  <Field label="Độ tin cậy (0–100)">
                    <input type="number" min={0} max={100} value={form.confidenceScore} onChange={(e) => setForm({ ...form, confidenceScore: e.target.value })} className={`${inputCls} max-w-[120px]`} />
                  </Field>
                </div>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu hồ sơ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  )
}
