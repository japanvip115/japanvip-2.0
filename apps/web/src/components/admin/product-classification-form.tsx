'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { SearchableSelect } from '@/components/admin/searchable-select'

type Category = { id: string; name: string; children?: Category[] }
type Brand = { id: string; name: string }
type ProductBadge = 'NEW_ARRIVAL' | 'SOLD_OUT' | 'ORDER_ONLY'

const SELECT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

const CONDITION_LABELS = { NEW: 'Mới 100%', LIKE_NEW: 'Như mới', GOOD: 'Tốt', FAIR: 'Khá' }
const STATUS_LABELS = { DRAFT: 'Bản nháp', ACTIVE: 'Đang bán', SOLD: 'Đã bán', ARCHIVED: 'Lưu kho' }

type Props = {
  productId: string
  categories: Category[]
  brands: Brand[]
  initialCategoryId?: string
  initialBrandId?: string
  initialOwnerType?: 'JAPANVIP' | 'PARTNER'
  initialCondition?: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'
  initialStatus?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'
  initialBadge?: ProductBadge | null
  initialOriginUrl?: string
}

export function ProductClassificationForm({
  productId, categories, brands,
  initialCategoryId = '', initialBrandId = '',
  initialOwnerType = 'JAPANVIP', initialCondition = 'NEW',
  initialStatus = 'DRAFT', initialBadge = null, initialOriginUrl = '',
}: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [brandId, setBrandId] = useState(initialBrandId)
  const [brandList, setBrandList] = useState<Brand[]>(brands)
  const [ownerType, setOwnerType] = useState(initialOwnerType)
  const [condition, setCondition] = useState(initialCondition)
  const [status, setStatus] = useState(initialStatus)
  const [badge, setBadge] = useState<ProductBadge | null>(initialBadge)
  const [originUrl, setOriginUrl] = useState(initialOriginUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateBrand(name: string) {
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    try {
      const res = await fetch('/api/v1/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, isActive: true }),
      })
      const data = await res.json()
      if (data.success) {
        const newBrand = { id: data.data.id, name: data.data.name }
        setBrandList((prev) => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)))
        setBrandId(newBrand.id)
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: categoryId || null,
          brandId: brandId || null,
          ownerType, condition, status, badge,
          originUrl: originUrl || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Lỗi lưu dữ liệu')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-200">Phân loại</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLS}>Danh mục</label>
          <SearchableSelect
            value={categoryId}
            onChange={setCategoryId}
            placeholder="— Chọn danh mục —"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Thương hiệu</label>
          <SearchableSelect
            value={brandId}
            onChange={setBrandId}
            placeholder="— Chọn thương hiệu —"
            options={brandList.map((b) => ({ value: b.id, label: b.name }))}
            onCreateNew={handleCreateBrand}
            createNewLabel="Tạo thương hiệu"
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Loại sản phẩm</label>
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value as typeof ownerType)} className={SELECT_CLS}>
            <option value="JAPANVIP">Japan VIP tự nhập</option>
            <option value="PARTNER">Đối tác ký gửi</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Tình trạng</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className={SELECT_CLS}>
            {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Trạng thái</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={SELECT_CLS}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Nhãn hiển thị (Badge)</label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'NEW_ARRIVAL', label: '🆕 Mới',        cls: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
              { value: 'SOLD_OUT',   label: '✅ Đã Bán',     cls: 'border-blue-500 bg-blue-500/10 text-blue-400' },
              { value: 'ORDER_ONLY', label: '📦 Hàng Order', cls: 'border-amber-500 bg-amber-500/10 text-amber-400' },
            ] as const).map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBadge(badge === b.value ? null : b.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  badge === b.value
                    ? b.cls
                    : 'border-gray-700 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-400'
                }`}
              >
                {b.label}
              </button>
            ))}
            {badge && (
              <button
                type="button"
                onClick={() => setBadge(null)}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Bỏ nhãn
              </button>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>URL nguồn (Nhật)</label>
          <input
            value={originUrl}
            onChange={(e) => setOriginUrl(e.target.value)}
            placeholder="https://www.amazon.co.jp/..."
            className={INPUT_CLS}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {saving ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang lưu...</>
        ) : saved ? (
          <><CheckCircle2 className="h-3.5 w-3.5" />Đã lưu</>
        ) : (
          'Lưu phân loại'
        )}
      </button>
    </div>
  )
}
