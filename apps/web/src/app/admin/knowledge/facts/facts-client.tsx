'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Database, Loader2, Trash2, Save, Plus, X, ArrowLeft } from 'lucide-react'

type Product = { id: string; name: string }
type Fact = {
  id: string; subject: string; predicate: string; object: string
  sourceReference: string | null; confidenceScore: number | null
  verificationStatus: string; relatedProductId: string | null; updatedAt: string
  article: { id: string; title: string } | null
}
type FactForm = {
  subject: string; predicate: string; object: string
  sourceReference: string; confidenceScore: string; verificationStatus: string; relatedProductId: string
}

const VERIF_BADGE: Record<string, { label: string; cls: string }> = {
  UNVERIFIED: { label: 'Chưa xác minh', cls: 'bg-amber-500/15 text-amber-300' },
  VERIFIED: { label: 'Đã xác minh', cls: 'bg-emerald-500/15 text-emerald-300' },
  DISPUTED: { label: 'Tranh chấp', cls: 'bg-red-500/15 text-red-300' },
}
const VERIFS = ['UNVERIFIED', 'VERIFIED', 'DISPUTED']

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red'

const emptyForm: FactForm = { subject: '', predicate: '', object: '', sourceReference: '', confidenceScore: '', verificationStatus: 'UNVERIFIED', relatedProductId: '' }

export function FactsClient({ products }: { products: Product[] }) {
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(true)
  const [fVerif, setFVerif] = useState('ALL')
  const [q, setQ] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FactForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState('')

  const productName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of products) m[p.id] = p.name
    return m
  }, [products])

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (fVerif !== 'ALL') qs.set('verification', fVerif)
    if (q.trim()) qs.set('q', q.trim())
    const res = await fetch(`/api/v1/admin/knowledge/facts?${qs.toString()}`)
    const d = await res.json()
    if (d.success) setFacts(d.data.items ?? [])
    setLoading(false)
  }, [fVerif, q])

  useEffect(() => { load() }, [load])

  function resetForm() { setForm(emptyForm); setEditingId(null) }

  function editFact(f: Fact) {
    setForm({
      subject: f.subject, predicate: f.predicate, object: f.object,
      sourceReference: f.sourceReference ?? '', confidenceScore: f.confidenceScore != null ? String(f.confidenceScore) : '',
      verificationStatus: f.verificationStatus, relatedProductId: f.relatedProductId ?? '',
    })
    setEditingId(f.id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save() {
    setErr('')
    if (!form.subject.trim() || !form.predicate.trim() || !form.object.trim()) { setErr('Cần đủ Chủ thể / Quan hệ / Giá trị'); return }
    setSaving(true)
    const payload = {
      subject: form.subject.trim(), predicate: form.predicate.trim(), object: form.object.trim(),
      sourceReference: form.sourceReference.trim() || undefined,
      confidenceScore: form.confidenceScore ? Number(form.confidenceScore) : undefined,
      verificationStatus: form.verificationStatus,
      relatedProductId: form.relatedProductId || undefined,
    }
    const url = editingId ? `/api/v1/admin/knowledge/facts/${editingId}` : '/api/v1/admin/knowledge/facts'
    const method = editingId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json()
    setSaving(false)
    if (!d.success) { setErr(d.error ?? 'Lưu thất bại'); return }
    resetForm(); load()
  }

  async function setVerif(id: string, verificationStatus: string) {
    setBusyId(id)
    await fetch(`/api/v1/admin/knowledge/facts/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verificationStatus }) })
    setBusyId(''); load()
  }

  async function remove(id: string) {
    if (!confirm('Xoá dữ kiện này?')) return
    setBusyId(id)
    await fetch(`/api/v1/admin/knowledge/facts/${id}`, { method: 'DELETE' })
    setBusyId(''); load()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6 lg:p-8">
      <div>
        <Link href="/admin/knowledge" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Kho tri thức
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-white"><Database className="h-5 w-5 text-brand-red" /> Dữ kiện (Facts)</h1>
        <p className="mt-0.5 text-sm text-slate-500">Dữ kiện dạng <i>Chủ thể — Quan hệ — Giá trị</i>. AI dùng fact <b>đã xác minh</b> làm dữ liệu chính xác.</p>
      </div>

      {/* Form */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161d2b] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{editingId ? 'Sửa dữ kiện' : 'Thêm dữ kiện'}</h2>
          {editingId && <button onClick={resetForm} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /> Huỷ sửa</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Chủ thể (vd: Nồi IH áp suất)" className={inputCls} />
          <input value={form.predicate} onChange={(e) => setForm({ ...form, predicate: e.target.value })} placeholder="Quan hệ (vd: phù hợp với)" className={inputCls} />
          <input value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} placeholder="Giá trị (vd: gia đình 3–5 người)" className={inputCls} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={form.verificationStatus} onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })} className={`${inputCls} [color-scheme:dark]`}>
            {VERIFS.map((v) => <option key={v} value={v}>{VERIF_BADGE[v]?.label ?? v}</option>)}
          </select>
          <select value={form.relatedProductId} onChange={(e) => setForm({ ...form, relatedProductId: e.target.value })} className={`${inputCls} [color-scheme:dark]`}>
            <option value="">— Không gắn sản phẩm —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input value={form.confidenceScore} onChange={(e) => setForm({ ...form, confidenceScore: e.target.value })} type="number" min={0} max={100} placeholder="Độ tin cậy 0–100" className={inputCls} />
        </div>
        <input value={form.sourceReference} onChange={(e) => setForm({ ...form, sourceReference: e.target.value })} placeholder="Nguồn tham khảo (URL hoặc ghi chú)" className={inputCls} />
        {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? 'Lưu' : 'Thêm dữ kiện'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm chủ thể / giá trị…" className={`${inputCls} max-w-xs`} />
        <select value={fVerif} onChange={(e) => setFVerif(e.target.value)} className={`${inputCls} max-w-[180px] [color-scheme:dark]`}>
          <option value="ALL">Mọi trạng thái</option>
          {VERIFS.map((v) => <option key={v} value={v}>{VERIF_BADGE[v]?.label ?? v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : facts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#161d2b] py-14 text-center">
          <Database className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <p className="text-sm text-slate-400">Chưa có dữ kiện nào.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {facts.map((f) => {
            const badge = VERIF_BADGE[f.verificationStatus] ?? { label: f.verificationStatus, cls: 'bg-white/10 text-slate-300' }
            return (
              <div key={f.id} className="rounded-xl border border-white/10 bg-[#161d2b] p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                  {f.relatedProductId && productName[f.relatedProductId] && <span className="text-[11px] text-slate-500">SP: {productName[f.relatedProductId]}</span>}
                  {f.confidenceScore != null && <span className="text-[11px] text-slate-500">· {f.confidenceScore}%</span>}
                  <span className="ml-auto text-[11px] text-slate-600">{new Date(f.updatedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="text-sm text-slate-100">
                  <b className="text-white">{f.subject}</b> <span className="text-slate-400">{f.predicate}</span> {f.object}
                </p>
                {f.sourceReference && <p className="mt-0.5 truncate text-[11px] text-slate-500">Nguồn: {f.sourceReference}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button onClick={() => editFact(f)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5">Sửa</button>
                  {f.verificationStatus !== 'VERIFIED' && (
                    <button onClick={() => setVerif(f.id, 'VERIFIED')} disabled={busyId === f.id} className="rounded-lg bg-emerald-600/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">Xác minh</button>
                  )}
                  <button onClick={() => remove(f.id)} disabled={busyId === f.id} className="ml-auto rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Xoá">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
