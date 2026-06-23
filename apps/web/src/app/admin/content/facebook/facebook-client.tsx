'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Sparkles, Send, CalendarClock, FileText, Trash2, Loader2, ExternalLink,
  Image as ImageIcon, Settings, CheckCircle2, AlertTriangle, Globe,
  ThumbsUp, MessageCircle, Share2, X, BarChart3, Upload, Trash,
} from 'lucide-react'
import Link from 'next/link'

type Post = {
  id: string; message: string; imageUrl: string | null; linkUrl: string | null; angle: string
  status: string; scheduledAt: string | null; publishedAt: string | null; fbPostId: string | null
  errorMessage: string | null; createdAt: string
}
type FbStatus = { pageId: string; hasToken: boolean; enabled: boolean; pageName: string }
type Engagement = { reactions: number; comments: number; shares: number }
type Insights = { byPost: Record<string, Engagement>; totals: { reactions: number; comments: number; shares: number; engagement: number; postCount: number } }

const ANGLES = [
  { key: 'product', label: 'Sản phẩm' },
  { key: 'promo', label: 'Khuyến mãi / Đấu giá' },
  { key: 'tips', label: 'Mẹo dùng / Kiến thức' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-white/10 text-slate-300' },
  SCHEDULED: { label: 'Đã lên lịch', cls: 'bg-blue-100 text-blue-700' },
  PUBLISHED: { label: 'Đã đăng', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Lỗi', cls: 'bg-red-100 text-red-700' },
}

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'SCHEDULED', label: 'Đã lên lịch' },
  { key: 'PUBLISHED', label: 'Đã đăng' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'FAILED', label: 'Lỗi' },
]

// datetime-local value cho "bây giờ" (chặn lên lịch quá khứ)
function nowLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

export function FacebookContentClient() {
  const [posts, setPosts] = useState<Post[]>([])
  const [status, setStatus] = useState<FbStatus | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [angle, setAngle] = useState('product')
  const [aiModel, setAiModel] = useState('auto')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmPost, setConfirmPost] = useState(false)

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch('/api/v1/admin/content/facebook'),
      fetch('/api/v1/admin/settings/facebook'),
    ])
    if (pRes.ok) { const d = await pRes.json(); setPosts(d.data?.posts ?? []) }
    if (sRes.ok) setStatus(await sRes.json())
    setLoading(false)
    // Số liệu tương tác (không chặn render — gọi Graph có thể chậm)
    fetch('/api/v1/admin/content/facebook/insights')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.success) setInsights(d.data) })
      .catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const pageName = status?.pageName || 'Japan VIP'
  const connected = !!status?.hasToken
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: posts.length }
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1
    return c
  }, [posts])
  const filtered = filter === 'ALL' ? posts : posts.filter((p) => p.status === filter)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Chỉ chấp nhận ảnh'); return }
    setUploading(true); setErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'settings')
      const res = await fetch('/api/v1/admin/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.success) setImageUrl(d.data.publicUrl)
      else setErr(d.error ?? 'Tải ảnh thất bại')
    } catch { setErr('Lỗi tải ảnh') }
    setUploading(false)
  }

  async function generate() {
    setGenerating(true); setErr('')
    try {
      const res = await fetch('/api/v1/admin/ai/facebook-post', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ angle, topic, model: aiModel }),
      })
      const d = await res.json()
      if (d.success) setMessage(d.data.message)
      else setErr(d.error ?? 'Không sinh được nội dung (cần Claude Code chạy local)')
    } catch { setErr('Lỗi gọi AI') }
    setGenerating(false)
  }

  async function create(status: 'DRAFT' | 'SCHEDULED'): Promise<string | null> {
    setErr('')
    if (message.trim().length < 5) { setErr('Nội dung quá ngắn'); return null }
    if (status === 'SCHEDULED' && !scheduledAt) { setErr('Chọn thời gian đăng'); return null }
    const res = await fetch('/api/v1/admin/content/facebook', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message, angle, status,
        imageUrl: imageUrl || undefined, linkUrl: linkUrl || undefined,
        scheduledAt: status === 'SCHEDULED' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      }),
    })
    const d = await res.json()
    if (!d.success) { setErr(d.error ?? 'Lưu thất bại'); return null }
    return d.data.post.id as string
  }

  function resetForm() { setMessage(''); setImageUrl(''); setLinkUrl(''); setScheduledAt(''); setTopic('') }

  async function saveDraft() {
    setBusy('draft'); const id = await create('DRAFT'); setBusy('')
    if (id) { resetForm(); load() }
  }
  async function schedule() {
    setBusy('schedule'); const id = await create('SCHEDULED'); setBusy('')
    if (id) { resetForm(); load() }
  }
  async function postNow() {
    setConfirmPost(false)
    setBusy('now')
    const id = await create('DRAFT')
    if (id) {
      const res = await fetch(`/api/v1/admin/content/facebook/${id}`, { method: 'POST' })
      const d = await res.json()
      if (!d.success) setErr(d.error ?? 'Đăng thất bại — kiểm tra kết nối Facebook')
      else resetForm()
      load()
    }
    setBusy('')
  }

  async function publishExisting(id: string) {
    setBusy(id)
    const res = await fetch(`/api/v1/admin/content/facebook/${id}`, { method: 'POST' })
    const d = await res.json()
    if (!d.success) setErr(d.error ?? 'Đăng thất bại')
    setBusy(''); load()
  }
  async function remove(id: string) {
    if (!confirm('Xoá bài đăng này?')) return
    setBusy(id)
    await fetch(`/api/v1/admin/content/facebook/${id}`, { method: 'DELETE' })
    setBusy(''); load()
  }

  const canPost = message.trim().length >= 5 && !busy
  const charCount = message.length

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canPost) { e.preventDefault(); setConfirmPost(true) }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#1a2233] to-[#161d2b] px-6 py-5 shadow-lg">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2] text-base font-black text-white shadow-sm shadow-blue-500/30">f</span>
            Bài đăng Facebook
          </h1>
          <p className="mt-1 text-sm text-slate-400">Soạn / AI tạo nội dung, đăng ngay hoặc lên lịch tự đăng lên Fanpage.</p>
        </div>
        <ConnectionBadge status={status} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Compose */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {ANGLES.map((a) => (
                <button key={a.key} onClick={() => setAngle(a.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${angle === a.key ? 'bg-brand-red text-white' : 'border border-white/10 text-slate-300 hover:border-brand-red hover:text-brand-red'}`}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Gợi ý cho AI (vd: tên sản phẩm, chương trình, chủ đề mẹo...)"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red" />
              <div className="flex gap-2">
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                  className="flex-1 rounded-lg border bg-[#161d2b] px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-red">
                  <option value="auto">⚡ Tự động (free khi chạy local)</option>
                  <option value="claude-opus-4-8">💎 Opus 4.8 · API (chất lượng cao nhất)</option>
                  <option value="claude-sonnet-4-6">🚀 Sonnet 4.6 · API (nhanh, tiết kiệm)</option>
                </select>
                <button onClick={generate} disabled={generating}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 whitespace-nowrap">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI tạo
                </button>
              </div>
            </div>

            <div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={onKeyDown} rows={9} placeholder="Nội dung bài đăng Facebook... (Ctrl/⌘ + Enter để đăng)"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red" />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-400">⌘/Ctrl + Enter để đăng nhanh</span>
                <span className={charCount > 2000 ? 'font-medium text-amber-600' : 'text-slate-400'}>{charCount.toLocaleString('vi-VN')} ký tự</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 transition focus-within:border-brand-red/50 focus-within:ring-2 focus-within:ring-brand-red/10">
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Dán URL ảnh, hoặc Tải lên →"
                    className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-slate-400 outline-none" />
                  <label className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${uploading ? 'bg-white/10 text-slate-400' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? 'Đang tải…' : 'Tải lên'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
                {imageUrl && (
                  <button onClick={() => setImageUrl('')} className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 transition hover:text-red-500">
                    <Trash className="h-3 w-3" /> Xoá ảnh
                  </button>
                )}
              </div>
              <div className="flex h-[46px] items-center gap-2 self-start rounded-xl border border-white/10 px-3 transition focus-within:border-brand-red/50 focus-within:ring-2 focus-within:ring-brand-red/10">
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link đính kèm (tùy chọn)"
                  className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-slate-400 outline-none" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <button onClick={() => setConfirmPost(true)} disabled={!canPost}
                className="flex items-center gap-1.5 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-50">
                {busy === 'now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Đăng ngay
              </button>

              <div className="flex items-center gap-2">
                <input type="datetime-local" value={scheduledAt} min={nowLocal()} onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-red" />
                <button onClick={schedule} disabled={!canPost || !scheduledAt}
                  className="flex items-center gap-1.5 rounded-lg border-2 border-solid border-brand-red bg-[#161d2b] px-4 py-2.5 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Lên lịch
                </button>
              </div>

              <button onClick={saveDraft} disabled={!canPost}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50">
                {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Lưu nháp
              </button>
            </div>

            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          </div>

          {/* List */}
          <div className="rounded-2xl border border-white/10 bg-[#161d2b] overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3.5">
              <h2 className="mr-2 font-bold text-white">Bài đã soạn</h2>
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filter === f.key ? 'bg-brand-red text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                  {f.label} {(counts[f.key] ?? 0) > 0 && <span className="opacity-70">({counts[f.key]})</span>}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex h-32 items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">{filter === 'ALL' ? 'Chưa có bài nào. Soạn bài đầu tiên ở trên!' : 'Không có bài ở mục này.'}</p>
            ) : (
              <div className="divide-y">
                {filtered.map((p) => {
                  const badge = STATUS_BADGE[p.status] ?? { label: p.status, cls: 'bg-white/10 text-slate-300' }
                  return (
                    <div key={p.id} className="flex gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]">
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg border object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                          <span className="text-xs text-slate-400">{ANGLES.find((a) => a.key === p.angle)?.label ?? p.angle}</span>
                          {p.status === 'SCHEDULED' && p.scheduledAt && (
                            <span className="text-xs font-medium text-blue-600">⏰ {new Date(p.scheduledAt).toLocaleString('vi-VN')}</span>
                          )}
                          {p.status === 'PUBLISHED' && p.publishedAt && (
                            <span className="text-xs text-emerald-600">{new Date(p.publishedAt).toLocaleString('vi-VN')}</span>
                          )}
                        </div>
                        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-200">{p.message}</p>
                        {p.status === 'PUBLISHED' && insights?.byPost[p.id] && (
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {insights.byPost[p.id]!.reactions}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {insights.byPost[p.id]!.comments}</span>
                            <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {insights.byPost[p.id]!.shares}</span>
                          </div>
                        )}
                        {p.status === 'FAILED' && p.errorMessage && <p className="mt-1 text-xs text-red-500">❌ {p.errorMessage}</p>}
                      </div>
                      <div className="flex flex-shrink-0 items-start gap-2">
                        {p.status === 'PUBLISHED' && p.fbPostId ? (
                          <a href={`https://facebook.com/${p.fbPostId}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50">
                            <ExternalLink className="h-3 w-3" /> Xem
                          </a>
                        ) : (
                          <button onClick={() => publishExisting(p.id)} disabled={!!busy}
                            className="flex items-center gap-1 rounded-lg bg-brand-red px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-red-dark disabled:opacity-60">
                            {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Đăng
                          </button>
                        )}
                        <button onClick={() => remove(p.id)} disabled={!!busy} className="rounded-lg border border-white/10 px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Xoá">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Analytics + Live preview — sticky */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {insights && insights.totals.postCount > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#161d2b] p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <BarChart3 className="h-3.5 w-3.5" /> Tương tác ({insights.totals.postCount} bài gần đây)
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={<ThumbsUp className="h-4 w-4" />} value={insights.totals.reactions} label="Cảm xúc" />
                <Stat icon={<MessageCircle className="h-4 w-4" />} value={insights.totals.comments} label="Bình luận" />
                <Stat icon={<Share2 className="h-4 w-4" />} value={insights.totals.shares} label="Chia sẻ" />
              </div>
              <div className="mt-3 rounded-lg bg-brand-red/5 px-3 py-2 text-center">
                <p className="text-xl font-black text-brand-red">{insights.totals.engagement.toLocaleString('vi-VN')}</p>
                <p className="text-[11px] text-slate-400">tổng tương tác</p>
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Globe className="h-3.5 w-3.5" /> Xem trước trên Facebook
          </p>
          <FacebookPreview pageName={pageName} message={message} imageUrl={imageUrl} linkUrl={linkUrl} scheduledAt={scheduledAt} />
          {!connected && (
            <Link href="/admin/settings/facebook" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 hover:bg-amber-100">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Chưa kết nối Fanpage — bấm để cấu hình token
            </Link>
          )}
        </div>
      </div>

      {/* Confirm publish modal */}
      {confirmPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmPost(false)}>
          <div className="w-full max-w-md rounded-xl bg-[#161d2b] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Send className="h-5 w-5 text-brand-red" /> Đăng ngay lên Fanpage?</h3>
              <button onClick={() => setConfirmPost(false)} className="text-slate-400 hover:text-slate-300"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-300">Bài sẽ hiển thị <b>công khai</b> trên <b>{pageName}</b> ngay lập tức. Bạn chắc chắn chứ?</p>
            <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-200 whitespace-pre-wrap">{message}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmPost(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">Huỷ</button>
              <button onClick={postNow} className="flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-dark">
                <Send className="h-4 w-4" /> Đăng ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className="flex items-center justify-center gap-1 text-slate-400">{icon}</div>
      <p className="mt-0.5 text-base font-bold text-white">{value.toLocaleString('vi-VN')}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  )
}

function ConnectionBadge({ status, loading }: { status: FbStatus | null; loading: boolean }) {
  if (loading) return <span className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</span>
  if (!status?.hasToken) {
    return (
      <Link href="/admin/settings/facebook" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
        <AlertTriangle className="h-4 w-4" /> Chưa kết nối · <span className="underline">Cấu hình</span>
      </Link>
    )
  }
  const name = status.pageName || 'Fanpage'
  return (
    <div className="flex items-center gap-3">
      <span className={`flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium ${status.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
        {status.enabled ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {status.enabled ? <>Đã kết nối · {name}</> : <>Kết nối OK · auto-đăng đang TẮT</>}
      </span>
      <Link href="/admin/settings/facebook" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5">
        <Settings className="h-4 w-4" /> Kết nối
      </Link>
    </div>
  )
}

function FacebookPreview({ pageName, message, imageUrl, linkUrl, scheduledAt }: {
  pageName: string; message: string; imageUrl: string; linkUrl: string; scheduledAt: string
}) {
  const when = scheduledAt ? new Date(scheduledAt).toLocaleString('vi-VN') : 'Vừa xong'
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161d2b] shadow-sm">
      <div className="flex items-center gap-2.5 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red text-sm font-black text-white">
          {(pageName || 'J').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{pageName}</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">{when} · <Globe className="h-3 w-3" /></p>
        </div>
      </div>
      <div className="px-3 pb-2">
        {message ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{message}</p>
        ) : (
          <p className="text-sm italic text-slate-500">Nội dung bài đăng sẽ hiển thị ở đây…</p>
        )}
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="preview" className="max-h-72 w-full border-y border-white/10 object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : linkUrl ? (
        <div className="mx-3 mb-2 overflow-hidden rounded-lg border">
          <div className="flex h-24 items-center justify-center bg-white/10 text-slate-500"><ExternalLink className="h-7 w-7" /></div>
          <p className="truncate border-t border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">{linkUrl}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-around border-t border-white/10 py-1.5 text-xs font-medium text-slate-400">
        <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" /> Thích</span>
        <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> Bình luận</span>
        <span className="flex items-center gap-1.5"><Share2 className="h-4 w-4" /> Chia sẻ</span>
      </div>
    </div>
  )
}
