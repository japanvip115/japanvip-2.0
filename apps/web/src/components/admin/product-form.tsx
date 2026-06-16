'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link2, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
type ProductFormData = {
  name?: string
  slug?: string
  description?: string
}

type SpecRow = { label: string; value: string }

type ScrapeResult = {
  name: string
  sku: string
  brand: string
  price: number | null
  description: string
  shortDescriptionHtml: string
  descriptionHtml: string
  specifications: SpecRow[]
  images: string[]
  originUrl: string
  metaTitle: string
  metaDesc: string
}

type Props = {
  mode: 'create' | 'edit'
  productId?: string
  initialData?: ProductFormData
}


function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

const SELECT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

export function ProductForm({ mode, productId, initialData = {} }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialData.name ?? '')
  const [slug, setSlug] = useState(initialData.slug ?? '')
  const [description, setDescription] = useState(initialData.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [descTab, setDescTab] = useState<'html' | 'preview'>('html')

  const [images, setImages] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<SpecRow[]>([])

  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')

  async function handleImport() {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError('')
    setImportSuccess('')
    try {
      const res = await fetch('/api/v1/admin/products/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        setImportError(data.error ?? 'Không thể lấy thông tin từ trang này.')
        return
      }
      const s: ScrapeResult = data.data
      if (s.name) {
        setName(s.name)
        if (mode === 'create') setSlug(slugify(s.name))
      }
      if (s.shortDescriptionHtml && s.descriptionHtml) {
        setDescription(s.shortDescriptionHtml + '\n\n' + s.descriptionHtml)
      } else if (s.descriptionHtml) {
        setDescription(s.descriptionHtml)
      } else if (s.shortDescriptionHtml) {
        setDescription(s.shortDescriptionHtml)
      } else if (s.description) {
        setDescription(s.description)
      }
      if (s.images.length > 0) setImages(s.images)
      if (s.specifications?.length > 0) setSpecifications(s.specifications)
      setImportSuccess(`Đã điền thông tin: ${s.name || 'sản phẩm'}. Nhớ lưu Phân loại & SEO riêng.`)
    } catch {
      setImportError('Có lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setImporting(false)
    }
  }

  function handleNameChange(val: string) {
    setName(val)
    if (mode === 'create') setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Tên sản phẩm không được để trống'); return }
    if (!slug.trim()) { setError('Slug không được để trống'); return }

    setSubmitting(true)
    setError('')

    const body = {
      name: name.trim(), slug: slug.trim(), description,
      images: images.length > 0 ? images : undefined,
      specifications: specifications.length > 0 ? specifications : undefined,
    }

    const url = mode === 'create' ? '/api/v1/admin/products' : `/api/v1/admin/products/${productId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) {
        router.push('/admin/products')
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Import từ URL ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-700">
            <Link2 className="h-3.5 w-3.5 text-gray-300" />
          </div>
          <h2 className="text-sm font-semibold text-gray-200">Import từ trang khác</h2>
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
            Tự động điền
          </span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          Dán link sản phẩm từ bất kỳ trang web nào — hệ thống tự đọc tên, mô tả, hình ảnh và điền vào form.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImport())}
            placeholder="https://congnghenhat.com/bep-tu-panasonic-kz-l32ast"
            className={INPUT_CLS}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang đọc...</>
            ) : (
              'Lấy thông tin'
            )}
          </button>
        </div>

        {importError && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {importError}
          </div>
        )}

        {importSuccess && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {importSuccess}
          </div>
        )}
      </div>

      <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Ảnh sản phẩm */}
        {images.length > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Ảnh sản phẩm ({images.length})</h2>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="group relative">
                  <img
                    src={src}
                    alt=""
                    className={`rounded-lg object-cover ring-1 ring-gray-700 ${i === 0 ? 'h-28 w-28' : 'h-16 w-16'}`}
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">Chính</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thông số kỹ thuật (scraped) */}
        {specifications.length > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-gray-200">Thông số kỹ thuật ({specifications.length} dòng)</h2>
              <button
                type="button"
                onClick={() => setSpecifications([])}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Xoá
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-700/50">
                  {specifications.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/40' : ''}>
                      <td className="w-2/5 px-5 py-2.5 text-xs font-medium text-gray-400">{row.label}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-200">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-200">Thông tin cơ bản</h2>
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>
                Tên sản phẩm <span className="text-red-400 normal-case">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ví dụ: Bếp từ Panasonic KY-T32K"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Slug (URL) <span className="text-red-400 normal-case">*</span>
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bep-tu-panasonic-ky-t32k"
                className={`${INPUT_CLS} font-mono text-xs`}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={LABEL_CLS}>Mô tả</label>
                <div className="flex gap-0.5 rounded-lg border border-gray-700 bg-gray-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDescTab('html')}
                    className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${descTab === 'html' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescTab('preview')}
                    className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${descTab === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Xem trước
                  </button>
                </div>
              </div>
              {descTab === 'html' ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  placeholder="Mô tả chi tiết về sản phẩm (HTML)..."
                  className={`${INPUT_CLS} font-mono text-xs leading-relaxed`}
                />
              ) : (
                <div
                  className="prose prose-sm prose-invert min-h-[160px] max-h-[400px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-200"
                  dangerouslySetInnerHTML={{ __html: description || '<p class="text-gray-600 italic">Chưa có nội dung mô tả.</p>' }}
                />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3 text-sm text-green-400">
            ✓ Đã lưu thành công
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
          </button>
          <Link href="/admin/products" className="cursor-pointer text-sm text-gray-500 transition-colors hover:text-gray-300">
            Hủy
          </Link>
        </div>
      </form>
    </div>
  )
}
