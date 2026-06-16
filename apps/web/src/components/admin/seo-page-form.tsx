'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    pagePath: string
    title: string | null
    description: string | null
    ogTitle: string | null
    ogDescription: string | null
    ogImage: string | null
    canonicalUrl: string | null
    robots: string
    schemaJson: any
  }
}

export function SeoPageForm({ mode, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [schemaError, setSchemaError] = useState('')

  const [form, setForm] = useState({
    pagePath: initial?.pagePath ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    ogTitle: initial?.ogTitle ?? '',
    ogDescription: initial?.ogDescription ?? '',
    ogImage: initial?.ogImage ?? '',
    canonicalUrl: initial?.canonicalUrl ?? '',
    robots: initial?.robots ?? 'index,follow',
    schemaJson: initial?.schemaJson ? JSON.stringify(initial.schemaJson, null, 2) : '',
  })

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSchemaError('')

    let schemaJson = null
    if (form.schemaJson.trim()) {
      try {
        schemaJson = JSON.parse(form.schemaJson)
      } catch {
        setSchemaError('Schema JSON không hợp lệ')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const url = mode === 'create'
        ? '/api/v1/admin/content/seo'
        : `/api/v1/admin/content/seo/${initial!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          schemaJson,
          title: form.title || null,
          description: form.description || null,
          ogTitle: form.ogTitle || null,
          ogDescription: form.ogDescription || null,
          ogImage: form.ogImage || null,
          canonicalUrl: form.canonicalUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/content/seo')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Xóa cấu hình SEO này?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/admin/content/seo/${initial!.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      router.push('/admin/content/seo')
    } catch (e: any) {
      setError(e.message)
      setDeleting(false)
    }
  }

  const titleLen = form.title.length
  const descLen = form.description.length

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-200">Thông tin trang</h3>

          <div>
            <label className={LABEL_CLS}>Đường dẫn trang <span className="text-red-400">*</span></label>
            <input
              value={form.pagePath}
              onChange={(e) => set('pagePath', e.target.value)}
              required
              disabled={mode === 'edit'}
              className={`${INPUT_CLS} font-mono disabled:opacity-50`}
              placeholder="/products/noi-com-tiger"
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Meta Title</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={255}
              className={INPUT_CLS}
              placeholder="Tiêu đề hiển thị trên Google..."
            />
            <p className={`mt-1 text-right text-xs ${titleLen > 60 ? 'text-yellow-400' : 'text-gray-500'}`}>{titleLen}/60</p>
          </div>

          <div>
            <label className={LABEL_CLS}>Meta Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={INPUT_CLS}
              placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm..."
            />
            <p className={`mt-1 text-right text-xs ${descLen > 160 ? 'text-yellow-400' : 'text-gray-500'}`}>{descLen}/160</p>
          </div>

          <div>
            <label className={LABEL_CLS}>Robots</label>
            <select
              value={form.robots}
              onChange={(e) => set('robots', e.target.value)}
              className={INPUT_CLS}
            >
              <option value="index,follow">index, follow</option>
              <option value="noindex,follow">noindex, follow</option>
              <option value="index,nofollow">index, nofollow</option>
              <option value="noindex,nofollow">noindex, nofollow</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLS}>Canonical URL</label>
            <input
              value={form.canonicalUrl}
              onChange={(e) => set('canonicalUrl', e.target.value)}
              className={INPUT_CLS}
              placeholder="https://japanvip.vn/..."
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-200">Open Graph</h3>

          <div>
            <label className={LABEL_CLS}>OG Title</label>
            <input
              value={form.ogTitle}
              onChange={(e) => set('ogTitle', e.target.value)}
              className={INPUT_CLS}
              placeholder="Tiêu đề khi share lên mạng xã hội..."
            />
          </div>

          <div>
            <label className={LABEL_CLS}>OG Description</label>
            <textarea
              value={form.ogDescription}
              onChange={(e) => set('ogDescription', e.target.value)}
              rows={3}
              className={INPUT_CLS}
            />
          </div>

          <ImageUploadField
            label="OG Image"
            folder="banners"
            value={form.ogImage ?? ''}
            onChange={(url) => set('ogImage', url)}
            previewClass="h-28 w-full"
            placeholder="https://... (1200×630px)"
          />

          <div>
            <label className={LABEL_CLS}>
              Schema.org JSON-LD
              {schemaError && <span className="ml-2 normal-case text-red-400">{schemaError}</span>}
            </label>
            <textarea
              value={form.schemaJson}
              onChange={(e) => { set('schemaJson', e.target.value); setSchemaError('') }}
              rows={8}
              className={`${INPUT_CLS} font-mono text-xs ${schemaError ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Product"\n}'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Đang xóa...' : 'Xóa cấu hình'}
          </button>
        )}
        <div className="ml-auto flex gap-3">
          <a
            href="/admin/content/seo"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
          >
            Hủy
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo Cấu Hình' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </form>
  )
}
