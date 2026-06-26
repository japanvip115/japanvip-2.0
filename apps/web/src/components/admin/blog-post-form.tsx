'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { X, Search, PackageSearch } from 'lucide-react'
import Image from 'next/image'

type Category = { id: string; name: string; slug?: string }
type RelatedProduct = { id: string; name: string; slug: string; price: number | null; image: string | null }

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
    scheduledAt?: string | Date | null
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

// Date/ISO → "YYYY-MM-DDTHH:mm" (giờ địa phương) cho input datetime-local
function toLocalInput(d: string | Date | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

function metaCounterCls(len: number, max: number) {
  const pct = len / max
  if (pct >= 1) return 'text-xs text-red-400'
  if (pct >= 0.85) return 'text-xs text-yellow-400'
  return 'text-xs text-gray-500'
}

export function BlogPostForm({ mode, categories: initialCategories, authorId, initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit')
  const [error, setError] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [categories, setCategories] = useState(initialCategories)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)

  // Related products
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<RelatedProduct[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function suggestProducts(title: string) {
    if (!title.trim()) return
    try {
      const res = await fetch('/api/v1/admin/content/blog/suggest-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const json = await res.json()
      if (Array.isArray(json) && json.length > 0) setRelatedProducts(json)
    } catch { /* silent */ }
  }

  function removeRelated(id: string) {
    setRelatedProducts((p) => p.filter((x) => x.id !== id))
  }

  function addRelated(product: RelatedProduct) {
    setRelatedProducts((p) => p.find((x) => x.id === product.id) ? p : [...p, product])
    setSearchResults([])
    setProductSearch('')
  }

  async function searchProducts(q: string) {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/v1/admin/products?q=${encodeURIComponent(q)}&take=5`)
      const json = await res.json()
      const items = (json.data ?? json ?? []) as any[]
      setSearchResults(items.map((p: any) => ({
        id: p.id, name: p.name, slug: p.slug,
        price: p.salePrice ? Number(p.salePrice) : null,
        image: p.images?.[0]?.url ?? null,
      })))
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  function onSearchChange(q: string) {
    setProductSearch(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchProducts(q), 300)
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Xóa danh mục "${name}"? Các bài viết thuộc danh mục này sẽ không còn danh mục.`)) return
    try {
      const res = await fetch('/api/v1/admin/content/blog-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Lỗi')
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (form.categoryId === id) set('categoryId', '')
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const res = await fetch('/api/v1/admin/content/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi')
      setCategories((prev) => [...prev, json])
      set('categoryId', json.id)
      setNewCatName('')
      setShowAddCat(false)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAddingCat(false)
    }
  }

  async function handlePasteAndImport() {
    setImportError('')
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim().startsWith('http')) {
        setImportError('Clipboard không có URL hợp lệ')
        return
      }
      setImportUrl(text.trim())
      await handleImportUrl(text.trim())
    } catch {
      setImportError('Không đọc được clipboard — hãy dán URL thủ công rồi nhấn Enter')
    }
  }

  async function handleImportUrl(url?: string) {
    const target = url ?? importUrl
    if (!target.trim()) return
    setImportUrl(target)
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/v1/admin/content/blog/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      setForm((f) => ({
        ...f,
        title: json.title || f.title,
        slug: json.title ? toSlug(json.title) : f.slug,
        excerpt: json.excerpt || f.excerpt,
        content: json.content || f.content,
        thumbnailUrl: json.thumbnailUrl || f.thumbnailUrl,
        metaTitle: json.title || f.metaTitle,
        metaDesc: json.excerpt || f.metaDesc,
      }))
      setImportUrl('')
      // Auto-suggest related products based on title
      if (json.title) await suggestProducts(json.title)
    } catch (e: any) {
      setImportError(e.message)
    } finally {
      setImporting(false)
    }
  }

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
    scheduledAt: toLocalInput(initial?.scheduledAt),
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
          scheduledAt: form.status === 'SCHEDULED' && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          relatedProductIds: relatedProducts.map((p) => p.id),
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

      {/* Inline URL import bar */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">Nhập bài từ URL</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
            placeholder="Dán link bài viết vào đây..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
          <button
            type="button"
            onClick={() => importUrl.trim() ? handleImportUrl() : handlePasteAndImport()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {importing ? '⏳ Đang lấy...' : '📋 Dán'}
          </button>
        </div>
        {importError && <p className="mt-1.5 text-xs text-red-400">{importError}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
            <div>
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
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL_CLS}>Nội dung <span className="text-red-400">*</span></label>
                <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
                  <button type="button" onClick={() => setContentTab('edit')}
                    className={`px-3 py-1 transition ${contentTab === 'edit' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                    Chỉnh sửa
                  </button>
                  <button type="button" onClick={() => setContentTab('preview')}
                    className={`px-3 py-1 transition ${contentTab === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                    Xem trước
                  </button>
                </div>
              </div>
              {contentTab === 'edit' ? (
                <textarea
                  value={form.content}
                  onChange={(e) => set('content', e.target.value)}
                  required
                  rows={16}
                  className={`${INPUT_CLS} font-mono`}
                  placeholder="Nội dung bài viết (hỗ trợ HTML)..."
                />
              ) : (
                <div
                  className="blog-content min-h-[320px] rounded-lg border border-gray-700 bg-white p-5 text-gray-900 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">{form.content.length} ký tự</p>
            </div>
          </div>

          {/* Related products */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-200">Sản phẩm liên quan</h3>
              <span className="text-xs text-gray-500">— tự chèn backlink cuối bài khi lưu</span>
            </div>

            {/* Selected products */}
            {relatedProducts.length > 0 && (
              <div className="space-y-2">
                {relatedProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
                    {p.image && (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-800">
                        <Image src={p.image} alt={p.name} fill className="object-cover" sizes="40px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 line-clamp-1">{p.name}</p>
                      {p.price && <p className="text-xs text-brand-red">{p.price.toLocaleString('vi-VN')}₫</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRelated(p.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Product search */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
                <Search className="h-4 w-4 text-gray-500 shrink-0" />
                <input
                  value={productSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Tìm sản phẩm để thêm..."
                  className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 focus:outline-none"
                />
                {searching && <span className="text-xs text-gray-500">...</span>}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addRelated(p)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors cursor-pointer text-left"
                    >
                      {p.image && (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-800">
                          <Image src={p.image} alt={p.name} fill className="object-cover" sizes="32px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 line-clamp-1">{p.name}</p>
                        {p.price && <p className="text-xs text-gray-500">{p.price.toLocaleString('vi-VN')}₫</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {relatedProducts.length === 0 && (
              <p className="text-xs text-gray-600">Chưa có sản phẩm nào. Nhập bài từ URL để tự gợi ý, hoặc tìm thủ công ở trên.</p>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-200">Xuất bản</h3>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {saving ? 'Đang lưu...' : mode === 'create' ? '✓ Tạo Bài' : '💾 Lưu Thay Đổi'}
              </button>
            </div>

            <div>
              <label className={LABEL_CLS}>Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="SCHEDULED">Lên lịch đăng</option>
                <option value="PUBLISHED">Xuất bản</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </div>

            {form.status === 'SCHEDULED' && (
              <div>
                <label className={LABEL_CLS}>Thời điểm đăng</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set('scheduledAt', e.target.value)}
                  required
                  className={`${INPUT_CLS} [color-scheme:dark]`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Bài tự đăng vào lần chạy <strong className="text-gray-400">8:00 sáng</strong> kế tiếp sau thời điểm hẹn.
                </p>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={`${LABEL_CLS} mb-0`}>Danh mục</label>
                <button
                  type="button"
                  onClick={() => setShowAddCat((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {showAddCat ? '✕ Đóng' : '+ Thêm danh mục'}
                </button>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
                <button
                  type="button"
                  onClick={() => set('categoryId', '')}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${!form.categoryId ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  — Không có —
                </button>
                {categories.map((c) => (
                  <div key={c.id} className={`flex items-center border-t border-gray-800 ${form.categoryId === c.id ? 'bg-gray-700' : 'hover:bg-gray-800'} transition-colors`}>
                    <button
                      type="button"
                      onClick={() => set('categoryId', c.id)}
                      className={`flex-1 px-3 py-2 text-left text-sm ${form.categoryId === c.id ? 'text-white' : 'text-gray-400'}`}
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="px-2 py-2 text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                      title="Xóa danh mục"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {showAddCat && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Tên danh mục mới..."
                    autoFocus
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addingCat || !newCatName.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {addingCat ? '...' : 'Tạo'}
                  </button>
                </div>
              )}
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
