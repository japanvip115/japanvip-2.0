'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'

type Category = { id: string; name: string }

type Props = {
  mode: 'create' | 'edit'
  categories: Category[]
  authorId: string
  initial?: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string
    thumbnailUrl: string | null
    status: string
    categoryId: string | null
    metaTitle: string | null
    metaDesc: string | null
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

function metaCounterCls(len: number, max: number) {
  const pct = len / max
  if (pct >= 1) return 'text-xs text-red-400'
  if (pct >= 0.85) return 'text-xs text-yellow-400'
  return 'text-xs text-gray-500'
}

export function BlogPostForm({ mode, categories, authorId, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    thumbnailUrl: initial?.thumbnailUrl ?? '',
    status: initial?.status ?? 'DRAFT',
    categoryId: initial?.categoryId ?? '',
    metaTitle: initial?.metaTitle ?? '',
    metaDesc: initial?.metaDesc ?? '',
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
        ? '/api/v1/admin/content/blog'
        : `/api/v1/admin/content/blog/${initial!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          authorId,
          categoryId: form.categoryId || null,
          thumbnailUrl: form.thumbnailUrl || null,
          excerpt: form.excerpt || null,
          metaTitle: form.metaTitle || null,
          metaDesc: form.metaDesc || null,
          publishedAt: form.status === 'PUBLISHED' ? new Date().toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/content/blog')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Xóa bài viết này?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/admin/content/blog/${initial!.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/content/blog')
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
            <div>
              <label className={LABEL_CLS}>Tiêu đề <span className="text-red-400">*</span></label>
              <input
                value={form.title}
                onChange={(e) => {
                  set('title', e.target.value)
                  if (mode === 'create') set('slug', toSlug(e.target.value))
                }}
                required
                className={INPUT_CLS}
                placeholder="Tiêu đề bài viết..."
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Slug <span className="text-red-400">*</span></label>
              <input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                required
                className={`${INPUT_CLS} font-mono`}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Tóm tắt</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                rows={2}
                className={INPUT_CLS}
                placeholder="Mô tả ngắn hiển thị trong danh sách..."
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Nội dung <span className="text-red-400">*</span></label>
              <textarea
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                required
                rows={16}
                className={`${INPUT_CLS} font-mono`}
                placeholder="Nội dung bài viết (hỗ trợ Markdown)..."
              />
              <p className="mt-1 text-xs text-gray-500">{form.content.length} ký tự</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">Xuất bản</h3>

            <div>
              <label className={LABEL_CLS}>Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Xuất bản</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Danh mục</label>
              <select
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">— Không có —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <ImageUploadField
              label="Ảnh thumbnail"
              folder="blogs"
              value={form.thumbnailUrl ?? ''}
              onChange={(url) => set('thumbnailUrl', url)}
              previewClass="h-32 w-full"
              placeholder="https://... (1200×630px)"
            />
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">SEO</h3>
            <div>
              <label className={LABEL_CLS}>Meta Title</label>
              <input
                value={form.metaTitle}
                onChange={(e) => set('metaTitle', e.target.value)}
                maxLength={255}
                className={INPUT_CLS}
              />
              <p className={`mt-1 ${metaCounterCls(form.metaTitle.length, 255)}`}>{form.metaTitle.length}/255</p>
            </div>
            <div>
              <label className={LABEL_CLS}>Meta Description</label>
              <textarea
                value={form.metaDesc}
                onChange={(e) => set('metaDesc', e.target.value)}
                rows={3}
                maxLength={160}
                className={INPUT_CLS}
              />
              <p className={`mt-1 ${metaCounterCls(form.metaDesc.length, 160)}`}>{form.metaDesc.length}/160</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/40 disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <a
            href="/admin/content/blog"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
          >
            Hủy
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo Bài Viết' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </form>
  )
}
