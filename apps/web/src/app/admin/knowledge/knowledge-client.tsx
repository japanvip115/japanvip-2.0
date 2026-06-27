'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Loader2, Trash2, Save, X, FolderPlus, ChevronDown,
  Database, ArrowLeft,
} from 'lucide-react'

type Category = { id: string; name: string; slug: string; description: string | null; sortOrder: number; _count?: { articles: number } }
type ArticleListItem = {
  id: string; title: string; slug: string; summary: string | null; status: string
  tags: string[]; confidenceScore: number | null; updatedAt: string
  category: { id: string; name: string } | null; _count: { facts: number }
}
type ArticleForm = {
  title: string; categoryId: string; summary: string; content: string
  tags: string; status: string; confidenceScore: string
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-white/10 text-slate-300' },
  PENDING_REVIEW: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-300' },
  APPROVED: { label: 'Đã duyệt', cls: 'bg-emerald-500/15 text-emerald-300' },
  ARCHIVED: { label: 'Lưu trữ', cls: 'bg-white/5 text-slate-400' },
}
const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED']

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red'

const emptyForm: ArticleForm = { title: '', categoryId: '', summary: '', content: '', tags: '', status: 'DRAFT', confidenceScore: '' }

export function KnowledgeClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fStatus, setFStatus] = useState('ALL')
  const [fCategory, setFCategory] = useState('ALL')
  const [q, setQ] = useState('')

  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<ArticleForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState('')

  const [catOpen, setCatOpen] = useState(false)
  const [newCat, setNewCat] = useState('')

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/v1/admin/knowledge/categories')
    const d = await res.json()
    if (d.success) setCategories(d.data.items ?? [])
  }, [])

  const loadArticles = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (fStatus !== 'ALL') qs.set('status', fStatus)
    if (fCategory !== 'ALL') qs.set('categoryId', fCategory)
    if (q.trim()) qs.set('q', q.trim())
    const res = await fetch(`/api/v1/admin/knowledge/articles?${qs.toString()}`)
    const d = await res.json()
    if (d.success) setArticles(d.data.items ?? [])
    setLoading(false)
  }, [fStatus, fCategory, q])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadArticles() }, [loadArticles])

  async function openNew() { setForm(emptyForm); setEditing('new'); setErr('') }

  async function openEdit(id: string) {
    setErr('')
    const res = await fetch(`/api/v1/admin/knowledge/articles/${id}`)
    const d = await res.json()
    if (!d.success) { setErr(d.error ?? 'Không tải được bài'); return }
    const a = d.data.item
    setForm({
      title: a.title, categoryId: a.categoryId ?? '', summary: a.summary ?? '',
      content: a.content, tags: (a.tags ?? []).join(', '), status: a.status,
      confidenceScore: a.confidenceScore != null ? String(a.confidenceScore) : '',
    })
    setEditing(id)
  }

  async function save() {
    setErr('')
    if (!form.title.trim() || !form.content.trim()) { setErr('Cần tiêu đề và nội dung'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      categoryId: form.categoryId || null,
      summary: form.summary.trim() || undefined,
      content: form.content,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: form.status,
      confidenceScore: form.confidenceScore ? Number(form.confidenceScore) : undefined,
    }
    const url = editing === 'new' ? '/api/v1/admin/knowledge/articles' : `/api/v1/admin/knowledge/articles/${editing}`
    const method = editing === 'new' ? 'POST' : 'PATCH'
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json()
    setSaving(false)
    if (!d.success) { setErr(d.error ?? 'Lưu thất bại'); return }
    setEditing(null); loadArticles()
  }

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    await fetch(`/api/v1/admin/knowledge/articles/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
    })
    setBusyId(''); loadArticles()
  }

  async function remove(id: string) {
    if (!confirm('Xoá bài tri thức này?')) return
    setBusyId(id)
    await fetch(`/api/v1/admin/knowledge/articles/${id}`, { method: 'DELETE' })
    setBusyId(''); loadArticles()
  }

  async function addCategory() {
    const name = newCat.trim()
    if (!name) return
    const res = await fetch('/api/v1/admin/knowledge/categories', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
    })
    const d = await res.json()
    if (d.success) { setNewCat(''); loadCategories() }
    else setErr(d.error ?? 'Tạo danh mục lỗi')
  }

  async function removeCategory(id: string) {
    if (!confirm('Xoá danh mục? (Bài viết sẽ bị gỡ khỏi danh mục, không bị xoá)')) return
    await fetch(`/api/v1/admin/knowledge/categories/${id}`, { method: 'DELETE' })
    loadCategories(); loadArticles()
  }

  // ── Editor view ──
  if (editing !== null) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6 lg:p-8">
        <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
        <h1 className="text-xl font-bold text-white">{editing === 'new' ? 'Bài tri thức mới' : 'Sửa bài tri thức'}</h1>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161d2b] p-5">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tiêu đề" className={inputCls} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`${inputCls} [color-scheme:dark]`}>
              <option value="">— Không danh mục —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${inputCls} [color-scheme:dark]`}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_BADGE[s]?.label ?? s}</option>)}
            </select>
            <input value={form.confidenceScore} onChange={(e) => setForm({ ...form, confidenceScore: e.target.value })}
              type="number" min={0} max={100} placeholder="Độ tin cậy 0–100" className={inputCls} />
          </div>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (cách nhau bằng dấu phẩy)" className={inputCls} />
          <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} placeholder="Tóm tắt ngắn (tùy chọn)" className={inputCls} />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16} placeholder="Nội dung tri thức (markdown/HTML)…" className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Huỷ</button>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white"><BookOpen className="h-5 w-5 text-brand-red" /> Kho tri thức</h1>
          <p className="mt-0.5 text-sm text-slate-500">Bài viết & dữ kiện nội bộ — AI dùng các mục <b>đã duyệt</b> làm kiến thức nền.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/knowledge/facts" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            <Database className="h-4 w-4" /> Dữ kiện (Facts)
          </Link>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-dark">
            <Plus className="h-4 w-4" /> Bài mới
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-2xl border border-white/10 bg-[#161d2b]">
        <button onClick={() => setCatOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-semibold text-white"><FolderPlus className="h-4 w-4" /> Danh mục ({categories.length})</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${catOpen ? '' : '-rotate-90'}`} />
        </button>
        {catOpen && (
          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex gap-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCategory() }} placeholder="Tên danh mục mới…" className={inputCls} />
              <button onClick={addCategory} className="rounded-lg bg-brand-red px-4 text-sm font-medium text-white hover:bg-brand-red-dark whitespace-nowrap">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <span className="text-sm text-slate-500">Chưa có danh mục.</span>}
              {categories.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {c.name} <span className="text-slate-500">({c._count?.articles ?? 0})</span>
                  <button onClick={() => removeCategory(c.id)} className="text-slate-500 hover:text-red-400" aria-label="Xoá"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề / tóm tắt…" className={`${inputCls} max-w-xs`} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={`${inputCls} max-w-[150px] [color-scheme:dark]`}>
          <option value="ALL">Mọi trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_BADGE[s]?.label ?? s}</option>)}
        </select>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={`${inputCls} max-w-[180px] [color-scheme:dark]`}>
          <option value="ALL">Mọi danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}

      {/* List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#161d2b] py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <p className="text-sm text-slate-400">Chưa có bài tri thức. Bấm <b>Bài mới</b> để thêm.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => {
            const badge = STATUS_BADGE[a.status] ?? { label: a.status, cls: 'bg-white/10 text-slate-300' }
            return (
              <div key={a.id} className="rounded-xl border border-white/10 bg-[#161d2b] p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                  {a.category && <span className="text-xs text-slate-400">{a.category.name}</span>}
                  {a._count.facts > 0 && <span className="text-[11px] text-slate-500">· {a._count.facts} fact</span>}
                  {a.confidenceScore != null && <span className="text-[11px] text-slate-500">· tin cậy {a.confidenceScore}%</span>}
                  <span className="ml-auto text-[11px] text-slate-600">{new Date(a.updatedAt).toLocaleString('vi-VN')}</span>
                </div>
                <button onClick={() => openEdit(a.id)} className="block text-left">
                  <p className="font-semibold text-slate-100 hover:text-brand-red">{a.title}</p>
                  {a.summary && <p className="line-clamp-1 text-sm text-slate-400">{a.summary}</p>}
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button onClick={() => openEdit(a.id)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5">Sửa</button>
                  {a.status !== 'APPROVED' && (
                    <button onClick={() => setStatus(a.id, 'APPROVED')} disabled={busyId === a.id} className="rounded-lg bg-emerald-600/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">Duyệt</button>
                  )}
                  {a.status === 'APPROVED' && (
                    <button onClick={() => setStatus(a.id, 'ARCHIVED')} disabled={busyId === a.id} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">Lưu trữ</button>
                  )}
                  <button onClick={() => remove(a.id)} disabled={busyId === a.id} className="ml-auto rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Xoá">
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
