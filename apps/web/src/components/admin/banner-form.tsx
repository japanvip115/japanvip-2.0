'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { Upload, X, Film } from 'lucide-react'

const POSITIONS = ['home-hero', 'home-mid', 'home-bottom', 'sidebar', 'product-top', 'auction-top']

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url)
}

function MediaUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mediaType, setMediaType] = useState<'image' | 'video'>(
    value && isVideo(value) ? 'video' : 'image'
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'banners')
      const res = await fetch('/api/v1/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload thất bại')
      onChange(json.data.publicUrl)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const accept = mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/avif'

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        Media banner <span className="text-red-400">*</span>
      </label>
      <div className="flex gap-2 mb-2">
        {(['image', 'video'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setMediaType(t); onChange('') }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mediaType === t
                ? 'bg-red-600 text-white'
                : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {t === 'video' ? <Film className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {t === 'image' ? 'Hình ảnh' : 'Video'}
          </button>
        ))}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-700">
          {isVideo(value) ? (
            <video src={value} className="h-40 w-full object-cover bg-black" controls muted />
          ) : (
            <img src={value} alt="" className="h-40 w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50 text-gray-500 transition-colors hover:border-red-600/50 hover:text-gray-400 disabled:opacity-50"
        >
          {mediaType === 'video' ? <Film className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
          <span className="text-sm">{uploading ? 'Đang upload...' : mediaType === 'video' ? 'Upload video (MP4, WebM, tối đa 100MB)' : 'Upload ảnh (JPG, PNG, WebP — 1920×600px)'}</span>
        </button>
      )}
      {!value && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none"
          placeholder={mediaType === 'video' ? 'Hoặc dán URL video...' : 'Hoặc dán URL ảnh...'}
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    title: string
    imageUrl: string
    linkUrl: string | null
    position: string
    sortOrder: number
    startsAt: Date | null
    endsAt: Date | null
    isActive: boolean
  }
}

function fmtDate(d: Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 16)
}

export function BannerForm({ mode, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    imageUrl: initial?.imageUrl ?? '',
    linkUrl: initial?.linkUrl ?? '',
    position: initial?.position ?? 'home-hero',
    sortOrder: initial?.sortOrder ?? 0,
    startsAt: fmtDate(initial?.startsAt ?? null),
    endsAt: fmtDate(initial?.endsAt ?? null),
    isActive: initial?.isActive ?? true,
  })

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = mode === 'create'
        ? '/api/v1/admin/content/banners'
        : `/api/v1/admin/content/banners/${initial!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          linkUrl: form.linkUrl || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/content/banners')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-500/15 border border-red-700/50 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="text-sm font-semibold text-gray-200">Thông tin banner</h3>

        <div>
          <label className={LABEL_CLS}>Tiêu đề <span className="text-red-400">*</span></label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            className={INPUT_CLS}
            placeholder="VD: Banner Tết 2026"
          />
        </div>

        <MediaUploadField
          value={form.imageUrl}
          onChange={(url) => set('imageUrl', url)}
        />

        <div>
          <label className={LABEL_CLS}>Link khi click</label>
          <input
            value={form.linkUrl}
            onChange={(e) => set('linkUrl', e.target.value)}
            className={INPUT_CLS}
            placeholder="/products hoặc https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Vị trí hiển thị <span className="text-red-400">*</span></label>
            <select
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
              className={INPUT_CLS}
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Thứ tự</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Bắt đầu</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Kết thúc</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Trạng thái</label>
          <select
            value={form.isActive ? '1' : '0'}
            onChange={(e) => set('isActive', e.target.value === '1')}
            className={INPUT_CLS}
          >
            <option value="1">Hiển thị</option>
            <option value="0">Ẩn</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a
          href="/admin/content/banners"
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
        >
          Hủy
        </a>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo Banner' : 'Lưu Thay Đổi'}
        </button>
      </div>
    </form>
  )
}
