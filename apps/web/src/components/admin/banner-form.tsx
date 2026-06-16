'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'

const POSITIONS = ['home-hero', 'home-mid', 'home-bottom', 'sidebar', 'product-top', 'auction-top']

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

        <ImageUploadField
          label="Hình ảnh banner"
          folder="banners"
          required
          value={form.imageUrl}
          onChange={(url) => set('imageUrl', url)}
          previewClass="h-40 w-full"
          placeholder="https://... (1920×600px khuyến nghị)"
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
