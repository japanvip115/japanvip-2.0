'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link2, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { SearchableSelect } from '@/components/admin/searchable-select'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { TemplatePicker } from '@/components/admin/template-picker'

type Category = { id: string; name: string }
type Brand = { id: string; name: string }
type SpecRow = { label: string; value: string }
type GiftRow = { name: string; price?: number; image?: string }

type ScrapeResult = {
  name: string; sku: string; brand: string; price: number | null
  description: string; shortDescriptionHtml: string; descriptionHtml: string
  specifications: SpecRow[]; images: string[]; originUrl: string
  metaTitle: string; metaDesc: string
}

type Props = {
  mode: 'create' | 'edit'
  productId?: string
  initialData?: {
    name?: string
    slug?: string
    description?: string
    categoryId?: string
    brandId?: string
    condition?: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'
    ownerType?: 'JAPANVIP' | 'PARTNER'
    status?: 'DRAFT' | 'ACTIVE'
    badge?: 'NEW_ARRIVAL' | 'SOLD_OUT' | 'ORDER_ONLY' | null
    showOnHome?: boolean
    originUrl?: string
    salePrice?: number | null
    marketPrice?: number | null
    metaTitle?: string
    metaDesc?: string
    gifts?: GiftRow[]
  }
  categories?: Category[]
  brands?: Brand[]
  imageSlot?: React.ReactNode
  returnTo?: string
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
}

const INPUT = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors'
const SELECT = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none transition-colors'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400'
const CARD = 'rounded-xl border border-gray-700 bg-gray-800/60 p-5'
const CARD_TITLE = 'mb-4 text-sm font-semibold text-gray-200'

export function ProductForm({ mode, productId, initialData = {}, categories = [], brands: initialBrands = [], imageSlot, returnTo }: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialData.name ?? '')
  const [slug, setSlug] = useState(initialData.slug ?? '')
  const [description, setDescription] = useState(initialData.description ?? '')
  const [descTab, setDescTab] = useState<'wysiwyg' | 'html' | 'preview'>('wysiwyg')

  const [categoryId, setCategoryId] = useState(initialData.categoryId ?? '')
  const [brandId, setBrandId] = useState(initialData.brandId ?? '')
  const [brandList, setBrandList] = useState<Brand[]>(initialBrands)
  const [condition, setCondition] = useState<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'>(initialData.condition ?? 'NEW')
  const [ownerType, setOwnerType] = useState<'JAPANVIP' | 'PARTNER'>(initialData.ownerType ?? 'JAPANVIP')
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>(initialData.status ?? 'DRAFT')
  const [badge, setBadge] = useState<'NEW_ARRIVAL' | 'SOLD_OUT' | 'ORDER_ONLY' | null>(initialData.badge ?? null)
  const [showOnHome, setShowOnHome] = useState(initialData.showOnHome ?? false)
  const [originUrl, setOriginUrl] = useState(initialData.originUrl ?? '')

  const [salePrice, setSalePrice] = useState(initialData.salePrice ? String(initialData.salePrice) : '')
  const [marketPrice, setMarketPrice] = useState(initialData.marketPrice ? String(initialData.marketPrice) : '')

  const [metaTitle, setMetaTitle] = useState(initialData.metaTitle ?? '')
  const [metaDesc, setMetaDesc] = useState(initialData.metaDesc ?? '')

  const [specifications, setSpecifications] = useState<SpecRow[]>([])
  const [gifts, setGifts] = useState<GiftRow[]>(initialData.gifts ?? [])

  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateBrand(name: string) {
    const res = await fetch('/api/v1/admin/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: slugify(name), isActive: true }),
    })
    const data = await res.json()
    if (data.success) {
      const nb = { id: data.data.id, name: data.data.name }
      setBrandList(prev => [...prev, nb].sort((a, b) => a.name.localeCompare(b.name)))
      setBrandId(nb.id)
    }
  }

  async function handleImport() {
    if (!importUrl.trim()) return
    setImporting(true); setImportMsg(null)
    try {
      const res = await fetch('/api/v1/admin/products/scrape', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await res.json()
      if (!data.success) { setImportMsg({ type: 'err', text: data.error ?? 'Không thể lấy thông tin.' }); return }
      const s: ScrapeResult = data.data
      if (s.name) { setName(s.name); setSlug(slugify(s.name)) }
      const desc = s.shortDescriptionHtml && s.descriptionHtml
        ? s.shortDescriptionHtml + '\n\n' + s.descriptionHtml
        : s.descriptionHtml || s.shortDescriptionHtml || s.description
      if (desc) setDescription(desc)
      if (s.specifications?.length > 0) setSpecifications(s.specifications)
      if (s.metaTitle) setMetaTitle(s.metaTitle)
      if (s.metaDesc) setMetaDesc(s.metaDesc)
      if (s.originUrl) setOriginUrl(s.originUrl)
      if (s.price) setSalePrice(String(s.price))
      setImportMsg({ type: 'ok', text: `Đã điền thông tin: ${s.name || 'sản phẩm'}` })
    } catch { setImportMsg({ type: 'err', text: 'Lỗi kết nối. Vui lòng thử lại.' })
    } finally { setImporting(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Tên sản phẩm không được để trống'); return }
    if (!slug.trim()) { setError('Slug không được để trống'); return }
    setSubmitting(true); setError('')
    const body = {
      name: name.trim(), slug: slug.trim(),
      description: description || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      condition, ownerType, status,
      badge: badge || undefined,
      showOnHome,
      originUrl: originUrl || undefined,
      salePrice: salePrice ? Number(salePrice) : undefined,
      marketPrice: marketPrice ? Number(marketPrice) : undefined,
      metaTitle: metaTitle || undefined,
      metaDesc: metaDesc || undefined,
      specifications: specifications.length > 0 ? specifications : undefined,
      gifts: gifts.length > 0 ? gifts : [],
    }
    const url = mode === 'create' ? '/api/v1/admin/products' : `/api/v1/admin/products/${productId}`
    try {
      const res = await fetch(url, { method: mode === 'create' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) router.push(mode === 'create' ? `/admin/products/${data.data.id}` : (returnTo ?? '/admin/products'))
      else setError(data.error ?? 'Có lỗi xảy ra')
    } catch { setError('Không thể kết nối. Vui lòng thử lại.')
    } finally { setSubmitting(false) }
  }

  const discount = salePrice && marketPrice && Number(marketPrice) > Number(salePrice)
    ? Math.round((1 - Number(salePrice) / Number(marketPrice)) * 100) : null

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Import bar ── */}
      <div className="mb-5 rounded-xl border border-blue-800/40 bg-blue-950/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-300">Import tự động từ URL</span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">Tự động điền</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="url" value={importUrl} onChange={e => setImportUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleImport())}
              placeholder="https://congnghenhat.com/bep-tu-panasonic-kz-l32ast"
              className="w-full rounded-lg border border-blue-800/50 bg-gray-900 px-3 py-2 pr-20 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none" />
            {importUrl ? (
              <button type="button" onClick={() => setImportUrl('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
                ✕ Xoá
              </button>
            ) : (
              <button type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    if (text.startsWith('http')) setImportUrl(text.trim())
                  } catch {}
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-blue-400 hover:text-blue-200 hover:bg-blue-500/20 transition-colors">
                📋 Dán
              </button>
            )}
          </div>
          <button type="button" onClick={handleImport} disabled={importing || !importUrl.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors shrink-0">
            {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang đọc...</> : 'Lấy thông tin'}
          </button>
        </div>
        {importMsg && (
          <p className={`mt-2 flex items-center gap-1.5 text-xs ${importMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {importMsg.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {importMsg.text}
          </p>
        )}
      </div>

      {/* ── 2-column layout ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ═══ LEFT COL (2/3) ═══ */}
        <div className="space-y-5 lg:col-span-2">

          {/* Thông tin cơ bản */}
          <div className={CARD}>
            <h2 className={CARD_TITLE}>Thông tin cơ bản</h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Tên sản phẩm <span className="text-red-400 normal-case font-normal">*</span></label>
                <input value={name}
                  onChange={e => { setName(e.target.value); if (mode === 'create') setSlug(slugify(e.target.value)) }}
                  placeholder="Ví dụ: Bếp từ Panasonic KY-T32K" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Slug (URL) <span className="text-red-400 normal-case font-normal">*</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">/san-pham/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value)}
                    placeholder="bep-tu-panasonic-ky-t32k"
                    className={`${INPUT} pl-[78px] font-mono text-xs`} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className={LABEL}>Mô tả</label>
                    <TemplatePicker onSelect={(html) => { setDescription(html); setDescTab('wysiwyg') }} />
                  </div>
                  <div className="flex gap-0.5 rounded-lg border border-gray-700 bg-gray-900 p-0.5 text-xs">
                    {([
                      { key: 'wysiwyg', label: '✏️ Soạn thảo' },
                      { key: 'html',    label: 'HTML' },
                      { key: 'preview', label: '👁 Xem trước' },
                    ] as const).map(tab => (
                      <button key={tab.key} type="button" onClick={() => setDescTab(tab.key)}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${descTab === tab.key ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                {descTab === 'wysiwyg' && (
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Nhập mô tả sản phẩm — hỗ trợ H2, H3, danh sách, bảng, in đậm..."
                    minHeight={320}
                  />
                )}
                {descTab === 'html' && (
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={14}
                    placeholder="Mô tả chi tiết sản phẩm (HTML)..." className={`${INPUT} font-mono text-xs leading-relaxed`} />
                )}
                {descTab === 'preview' && (
                  <div className="prose prose-sm prose-invert min-h-[160px] max-h-[500px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: description || '<p class="text-gray-600 italic">Chưa có nội dung.</p>' }} />
                )}
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className={CARD}>
            <h2 className={CARD_TITLE}>SEO</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={LABEL}>Meta Title</label>
                  <span className={`text-xs tabular-nums ${metaTitle.length > 60 ? 'text-red-400' : 'text-gray-600'}`}>{metaTitle.length}/60</span>
                </div>
                <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                  placeholder="Tên sản phẩm — Japan VIP" className={INPUT} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={LABEL}>Meta Description</label>
                  <span className={`text-xs tabular-nums ${metaDesc.length > 160 ? 'text-red-400' : 'text-gray-600'}`}>{metaDesc.length}/160</span>
                </div>
                <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2}
                  placeholder="Mô tả ngắn hiển thị trên Google (tối đa 160 ký tự)..." className={INPUT} />
              </div>
              {(metaTitle || metaDesc || slug) && (
                <div className="rounded-lg bg-white px-4 py-3 text-xs shadow-sm">
                  <p className="truncate font-medium text-blue-700 underline">{metaTitle || name || 'Tiêu đề sản phẩm'}</p>
                  <p className="text-[11px] text-green-700">store.japanvip.vn/san-pham/{slug || 'slug'}</p>
                  <p className="mt-0.5 line-clamp-2 text-gray-600">{metaDesc || 'Mô tả sản phẩm...'}</p>
                </div>
              )}
            </div>
          </div>
          {/* Quà tặng */}
          <div className={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`${CARD_TITLE} mb-0`}>🎁 Quà tặng kèm</h2>
              <button type="button"
                onClick={() => setGifts(g => [...g, { name: '', price: undefined, image: '' }])}
                className="flex items-center gap-1 rounded-lg border border-dashed border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                <X className="h-3 w-3 rotate-45" /> Thêm quà
              </button>
            </div>
            {gifts.length === 0 && (
              <p className="text-xs text-gray-600 italic">Chưa có quà tặng. Nhấn "Thêm quà" để thêm.</p>
            )}
            <div className="space-y-3">
              {gifts.map((g, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input
                      value={g.name}
                      onChange={e => setGifts(gs => gs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Tên quà tặng (VD: Nồi hấp thủy tinh)"
                      className={INPUT}
                    />
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text" inputMode="numeric"
                          value={g.price ? Number(g.price).toLocaleString('vi-VN') : ''}
                          onChange={e => setGifts(gs => gs.map((x, j) => j === i ? { ...x, price: Number(e.target.value.replace(/[^0-9]/g, '')) || undefined } : x))}
                          placeholder="Trị giá (₫) — tuỳ chọn"
                          className={`${INPUT} pr-6`}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                      </div>
                      <input
                        value={g.image ?? ''}
                        onChange={e => setGifts(gs => gs.map((x, j) => j === i ? { ...x, image: e.target.value } : x))}
                        placeholder="URL ảnh — tuỳ chọn"
                        className={`${INPUT} flex-1`}
                      />
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => setGifts(gs => gs.filter((_, j) => j !== i))}
                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-500 hover:border-red-700 hover:text-red-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COL (1/3) ═══ */}
        <div className="space-y-5">

          {/* Submit card */}
          <div className={CARD}>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Trạng thái</label>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={SELECT}>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="ACTIVE">Đăng bán ngay</option>
                </select>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}
                </div>
              )}
              <button type="submit" disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
              </button>
              {mode === 'edit' && slug && (
                <a
                  href={`/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-600 py-2 text-xs font-medium text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Xem trên website
                </a>
              )}
              <Link href={returnTo ?? '/admin/products'} className="block text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Hủy bỏ
              </Link>
            </div>
          </div>

          {/* Phân loại */}
          <div className={CARD}>
            <h2 className={CARD_TITLE}>Phân loại</h2>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Danh mục</label>
                <SearchableSelect value={categoryId} onChange={setCategoryId} placeholder="— Chọn danh mục —"
                  options={categories.map(c => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <label className={LABEL}>Thương hiệu</label>
                <SearchableSelect value={brandId} onChange={setBrandId} placeholder="— Chọn thương hiệu —"
                  options={brandList.map(b => ({ value: b.id, label: b.name }))}
                  onCreateNew={handleCreateBrand} createNewLabel="Tạo thương hiệu" />
              </div>
              <div>
                <label className={LABEL}>Loại sản phẩm</label>
                <select value={ownerType} onChange={e => setOwnerType(e.target.value as typeof ownerType)} className={SELECT}>
                  <option value="JAPANVIP">Japan VIP tự nhập</option>
                  <option value="PARTNER">Đối tác ký gửi</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Tình trạng</label>
                <select value={condition} onChange={e => setCondition(e.target.value as typeof condition)} className={SELECT}>
                  <option value="NEW">Mới 100%</option>
                  <option value="LIKE_NEW">Như mới</option>
                  <option value="GOOD">Tốt</option>
                  <option value="FAIR">Khá</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Nhãn Badge &amp; Trang chủ</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { value: 'NEW_ARRIVAL', label: '🆕 Mới',     cls: 'border-emerald-600 bg-emerald-500/10 text-emerald-400' },
                    { value: 'SOLD_OUT',    label: '✅ Đã bán',  cls: 'border-blue-600 bg-blue-500/10 text-blue-400' },
                    { value: 'ORDER_ONLY',  label: '📦 Order',   cls: 'border-amber-600 bg-amber-500/10 text-amber-400' },
                  ] as const).map(b => (
                    <button key={b.value} type="button"
                      onClick={() => setBadge(badge === b.value ? null : b.value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all text-center ${badge === b.value ? b.cls : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'}`}>
                      {b.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowOnHome(v => !v)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${showOnHome ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'}`}
                  >
                    <span className={`inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${showOnHome ? 'bg-red-500' : 'bg-gray-600'}`}>
                      <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform ${showOnHome ? 'translate-x-3' : 'translate-x-0.5'}`} />
                    </span>
                    {showOnHome ? 'Trang chủ' : 'Trang chủ'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Giá bán */}
          <div className={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`${CARD_TITLE} mb-0`}>Giá bán</h2>
              {discount && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">-{discount}%</span>}
            </div>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Giá bán (₫)</label>
                <div className="relative">
                  <input type="text" inputMode="numeric"
                    value={salePrice ? Number(salePrice).toLocaleString('vi-VN') : ''}
                    onChange={e => setSalePrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="5.990.000" className={`${INPUT} pr-6`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                </div>
                {salePrice && <p className="mt-1 text-sm font-bold text-red-400">{Number(salePrice).toLocaleString('vi-VN')} ₫</p>}
              </div>
              <div>
                <label className={LABEL}>Giá thị trường (₫)</label>
                <div className="relative">
                  <input type="text" inputMode="numeric"
                    value={marketPrice ? Number(marketPrice).toLocaleString('vi-VN') : ''}
                    onChange={e => setMarketPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="7.500.000" className={`${INPUT} pr-6`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                </div>
                {marketPrice && <p className="mt-1 text-xs text-gray-500 line-through">{Number(marketPrice).toLocaleString('vi-VN')} ₫</p>}
              </div>
            </div>
          </div>

          {/* Hình ảnh sản phẩm — trong sidebar, dưới Giá bán */}
          {imageSlot && <div key="image-slot">{imageSlot}</div>}

          {/* URL nguồn */}
          <div className={CARD}>
            <h2 className={CARD_TITLE}>URL nguồn (Nhật)</h2>
            <input value={originUrl} onChange={e => setOriginUrl(e.target.value)}
              placeholder="https://www.amazon.co.jp/..." className={INPUT} />
            <p className="mt-1.5 text-xs text-gray-600">Link gốc sản phẩm trên Amazon JP, Rakuten...</p>
          </div>
        </div>
      </div>
    </form>
  )
}
