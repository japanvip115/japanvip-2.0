'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'

type Category = { id: string; name: string }

type Props = {
  mode: 'create' | 'edit'
  parents: Category[]
  initial?: {
    id: string
    name: string
    slug: string
    description: string | null
    imageUrl: string | null
    imagePosition: string | null
    icon: string | null
    parentId: string | null
    sortOrder: number
    isActive: boolean
    showOnHome: boolean
    metaTitle: string | null
    metaDesc: string | null
  }
}

const STEP = 5
function clamp(v: number) { return Math.max(0, Math.min(100, v)) }
function posToXY(pos: string): [number, number] {
  const parts = (pos ?? '50% 50%').trim().split(/\s+/)
  const parse = (s: string) => parseInt(s) || 50
  return [parse(parts[0] ?? '50%'), parse(parts[1] ?? '50%')]
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

export function CategoryForm({ mode, parents, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    imageUrl: initial?.imageUrl ?? '',
    icon: initial?.icon ?? '',
    parentId: initial?.parentId ?? '',
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
    showOnHome: initial?.showOnHome ?? true,
    metaTitle: initial?.metaTitle ?? '',
    metaDesc: initial?.metaDesc ?? '',
  })

  const initXY = posToXY(initial?.imagePosition ?? '50% 50%')
  const [imgX, setImgX] = useState(initXY[0])
  const [imgY, setImgY] = useState(initXY[1])
  const imagePosition = `${imgX}% ${imgY}%`

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = mode === 'create'
        ? '/api/v1/admin/categories'
        : `/api/v1/admin/categories/${initial!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
          imageUrl: form.imageUrl || null,
          imagePosition: form.imageUrl ? imagePosition : null,
          icon: form.icon || null,
          description: form.description || null,
          metaTitle: form.metaTitle || null,
          metaDesc: form.metaDesc || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/categories')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Xóa danh mục này? Hành động không thể hoàn tác.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/admin/categories/${initial!.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/categories')
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">Thông tin cơ bản</h3>

          <div>
            <label className={LABEL_CLS}>Tên danh mục <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value)
                if (mode === 'create') set('slug', toSlug(e.target.value))
              }}
              required
              className={INPUT_CLS}
              placeholder="VD: Nồi cơm điện"
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Slug <span className="text-red-400">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              required
              className={INPUT_CLS + ' font-mono'}
              placeholder="noi-com-dien"
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Danh mục cha</label>
            <select
              value={form.parentId}
              onChange={(e) => set('parentId', e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">— Không có (cấp 1) —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLS}>Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={INPUT_CLS}
              placeholder="Mô tả ngắn về danh mục..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Thứ tự hiển thị</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
                className={INPUT_CLS}
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
            <div>
              <label className={LABEL_CLS}>Trang chủ</label>
              <select
                value={form.showOnHome ? '1' : '0'}
                onChange={(e) => set('showOnHome', e.target.value === '1')}
                className={INPUT_CLS}
              >
                <option value="1">Hiện ở trang chủ</option>
                <option value="0">Ẩn khỏi trang chủ</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">SEO</h3>

          <ImageUploadField
            label="Icon danh mục (PNG/WebP)"
            folder="category-icons"
            value={form.icon ?? ''}
            onChange={(url) => set('icon', url)}
            previewClass="h-20 w-20"
            placeholder="https://..."
          />

          <ImageUploadField
            label="Ảnh đại diện danh mục"
            folder="categories"
            value={form.imageUrl ?? ''}
            onChange={(url) => set('imageUrl', url)}
            previewClass="h-32 w-full"
            placeholder="https://..."
          />

          {form.imageUrl && (
            <div>
              <label className={LABEL_CLS}>Căn chỉnh ảnh banner</label>
              <div className="flex items-center gap-4 mt-1">
                <div className="grid grid-cols-3 gap-1 w-fit">
                  <div />
                  <button type="button" onClick={() => setImgY(clamp(imgY - STEP))} className="w-9 h-9 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95 transition flex items-center justify-center">↑</button>
                  <div />
                  <button type="button" onClick={() => setImgX(clamp(imgX - STEP))} className="w-9 h-9 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95 transition flex items-center justify-center">←</button>
                  <button type="button" onClick={() => { setImgX(50); setImgY(50) }} className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition text-xs flex items-center justify-center">⊙</button>
                  <button type="button" onClick={() => setImgX(clamp(imgX + STEP))} className="w-9 h-9 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95 transition flex items-center justify-center">→</button>
                  <div />
                  <button type="button" onClick={() => setImgY(clamp(imgY + STEP))} className="w-9 h-9 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95 transition flex items-center justify-center">↓</button>
                  <div />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Ngang</span><span className="text-gray-300">{imgX}%</span></div>
                    <input type="range" min={0} max={100} value={imgX} onChange={(e) => setImgX(Number(e.target.value))} className="w-full accent-red-600 h-1.5 rounded-full cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Dọc</span><span className="text-gray-300">{imgY}%</span></div>
                    <input type="range" min={0} max={100} value={imgY} onChange={(e) => setImgY(Number(e.target.value))} className="w-full accent-red-600 h-1.5 rounded-full cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="mt-2 w-full h-28 overflow-hidden rounded-lg">
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: imagePosition }} />
              </div>
            </div>
          )}

          <div>
            <label className={LABEL_CLS}>Meta Title</label>
            <input
              value={form.metaTitle}
              onChange={(e) => set('metaTitle', e.target.value)}
              maxLength={255}
              className={INPUT_CLS}
              placeholder="Tiêu đề SEO..."
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Meta Description</label>
            <textarea
              value={form.metaDesc}
              onChange={(e) => set('metaDesc', e.target.value)}
              rows={4}
              className={INPUT_CLS}
              placeholder="Mô tả SEO (150–160 ký tự)..."
            />
            <p className="mt-1 text-right text-xs text-gray-500">{form.metaDesc.length}/160</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Đang xóa...' : 'Xóa danh mục'}
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <a href="/admin/categories" className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer">
            Hủy
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo Danh Mục' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </form>
  )
}
