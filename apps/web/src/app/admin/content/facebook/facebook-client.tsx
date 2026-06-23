'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, Send, CalendarClock, FileText, Trash2, Loader2, ExternalLink, Image as ImageIcon, Settings } from 'lucide-react'
import Link from 'next/link'

type Post = {
  id: string; message: string; imageUrl: string | null; linkUrl: string | null; angle: string
  status: string; scheduledAt: string | null; publishedAt: string | null; fbPostId: string | null
  errorMessage: string | null; createdAt: string
}

const ANGLES = [
  { key: 'product', label: 'Sản phẩm' },
  { key: 'promo', label: 'Khuyến mãi / Đấu giá' },
  { key: 'tips', label: 'Mẹo dùng / Kiến thức' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-gray-100 text-gray-600' },
  SCHEDULED: { label: 'Đã lên lịch', cls: 'bg-blue-100 text-blue-700' },
  PUBLISHED: { label: 'Đã đăng', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Lỗi', cls: 'bg-red-100 text-red-700' },
}

export function FacebookContentClient() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [angle, setAngle] = useState('product')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/admin/content/facebook')
    if (res.ok) { const d = await res.json(); setPosts(d.data?.posts ?? []) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function generate() {
    setGenerating(true); setErr('')
    try {
      const res = await fetch('/api/v1/admin/ai/facebook-post', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ angle, topic }),
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

  function resetForm() {
    setMessage(''); setImageUrl(''); setLinkUrl(''); setScheduledAt(''); setTopic('')
  }

  async function saveDraft() {
    setBusy('draft'); const id = await create('DRAFT'); setBusy('')
    if (id) { resetForm(); load() }
  }
  async function schedule() {
    setBusy('schedule'); const id = await create('SCHEDULED'); setBusy('')
    if (id) { resetForm(); load() }
  }
  async function postNow() {
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877F2] text-white text-sm font-black">f</span>
            Bài đăng Facebook
          </h1>
          <p className="mt-1 text-sm text-gray-500">Soạn / AI tạo nội dung, đăng ngay hoặc lên lịch tự đăng lên Fanpage.</p>
        </div>
        <Link href="/admin/settings/facebook" className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <Settings className="h-4 w-4" /> Kết nối
        </Link>
      </div>

      {/* Compose */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {ANGLES.map((a) => (
            <button key={a.key} onClick={() => setAngle(a.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${angle === a.key ? 'bg-brand-red text-white' : 'border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Gợi ý cho AI (vd: tên sản phẩm, chương trình, chủ đề mẹo...)"
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red" />
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 whitespace-nowrap">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI tạo
          </button>
        </div>

        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Nội dung bài đăng Facebook..."
          className="w-full rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg border px-3">
            <ImageIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL ảnh (tùy chọn)"
              className="flex-1 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3">
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link đính kèm (tùy chọn)"
              className="flex-1 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
          </div>
        </div>

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="preview" className="max-h-48 rounded-lg border object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <button onClick={postNow} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60">
            {busy === 'now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Đăng ngay
          </button>

          <div className="flex items-center gap-2">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-red" />
            <button onClick={schedule} disabled={!!busy}
              className="flex items-center gap-1.5 rounded-lg border-2 border-solid border-brand-red bg-white px-4 py-2.5 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors disabled:opacity-60">
              {busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Lên lịch
            </button>
          </div>

          <button onClick={saveDraft} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Lưu nháp
          </button>
        </div>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </div>

      {/* List */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-bold text-gray-900">Bài đã soạn ({posts.length})</h2></div>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Chưa có bài nào. Soạn bài đầu tiên ở trên!</p>
        ) : (
          <div className="divide-y">
            {posts.map((p) => {
              const badge = STATUS_BADGE[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
              return (
                <div key={p.id} className="flex gap-4 px-5 py-4">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg border object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      <span className="text-xs text-gray-400">{ANGLES.find((a) => a.key === p.angle)?.label ?? p.angle}</span>
                      {p.status === 'SCHEDULED' && p.scheduledAt && (
                        <span className="text-xs text-blue-600">⏰ {new Date(p.scheduledAt).toLocaleString('vi-VN')}</span>
                      )}
                      {p.status === 'PUBLISHED' && p.publishedAt && (
                        <span className="text-xs text-emerald-600">{new Date(p.publishedAt).toLocaleString('vi-VN')}</span>
                      )}
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm text-gray-700">{p.message}</p>
                    {p.status === 'FAILED' && p.errorMessage && <p className="mt-1 text-xs text-red-500">❌ {p.errorMessage}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-start gap-2">
                    {p.status === 'PUBLISHED' && p.fbPostId ? (
                      <a href={`https://facebook.com/${p.fbPostId}`} target="_blank" rel="noreferrer"
                        className="rounded-lg border px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50">Xem</a>
                    ) : (
                      <button onClick={() => publishExisting(p.id)} disabled={!!busy}
                        className="flex items-center gap-1 rounded-lg bg-brand-red px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-red-dark disabled:opacity-60">
                        {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Đăng
                      </button>
                    )}
                    <button onClick={() => remove(p.id)} disabled={!!busy} className="rounded-lg border px-2 py-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
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
  )
}
