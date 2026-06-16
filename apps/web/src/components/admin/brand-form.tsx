'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { ImageUploadField } from '@/components/admin/image-upload-field'

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    country: string
    description: string | null
    isActive: boolean
  }
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

export function BrandForm({ mode, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    logoUrl: initial?.logoUrl ?? '',
    country: initial?.country ?? 'Japan',
    description: initial?.description ?? '',
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
      const url = mode === 'create' ? '/api/v1/admin/brands' : `/api/v1/admin/brands/${initial!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          logoUrl: form.logoUrl || null,
          description: form.description || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/brands')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Xóa thương hiệu này? Hành động không thể hoàn tác.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/admin/brands/${initial!.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/brands')
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-700/50 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="text-sm font-semibold text-gray-200">Thông tin thương hiệu</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Tên thương hiệu <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value)
                if (mode === 'create') set('slug', toSlug(e.target.value))
              }}
              required
              className={INPUT_CLS}
              placeholder="VD: Tiger Corporation"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Slug <span className="text-red-400">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              required
              className={INPUT_CLS + ' font-mono'}
              placeholder="tiger-corporation"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Xuất xứ</label>
            <input
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              className={INPUT_CLS}
              placeholder="Japan"
            />
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

        <ImageUploadField
          label="Logo thương hiệu"
          folder="brands"
          value={form.logoUrl ?? ''}
          onChange={(url) => set('logoUrl', url)}
          previewClass="h-20 w-40 bg-gray-900 object-contain p-1"
          placeholder="https://..."
        />

        <div>
          <label className={LABEL_CLS}>Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className={INPUT_CLS}
            placeholder="Giới thiệu ngắn về thương hiệu..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Đang xóa...' : 'Xóa thương hiệu'}
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <a
            href="/admin/brands"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
          >
            Hủy
          </a>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo Thương Hiệu' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </form>
  )
}
