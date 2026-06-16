'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  sku: string
  images: { url: string }[]
}

// Quick duration presets
const DURATION_PRESETS = [
  { label: '1 giờ', hours: 1 },
  { label: '3 giờ', hours: 3 },
  { label: '6 giờ', hours: 6 },
  { label: '12 giờ', hours: 12 },
  { label: '24 giờ', hours: 24 },
  { label: '3 ngày', hours: 72 },
  { label: '7 ngày', hours: 168 },
]

// Quick increment presets
const INCREMENT_PRESETS = [
  { label: '10K', value: 10000 },
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
]

// Quick start price presets
const START_PRESETS = [
  { label: '100K', value: 100000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 },
  { label: '50M', value: 50000000 },
]

function toLocalDatetime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

// Shared input class for dark admin theme
const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'
const cardCls = 'rounded-xl border border-gray-700 bg-gray-800/60 p-5'
const sectionTitle = 'mb-4 flex items-center gap-2 text-sm font-bold text-gray-100'

export function CreateAuctionForm({ products }: { products: Product[] }) {
  const router = useRouter()
  const [productId, setProductId] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('50000')
  const [reservePrice, setReservePrice] = useState('')
  const [buyNowPrice, setBuyNowPrice] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [extendTrigger, setExtendTrigger] = useState('3')
  const [extendMinutes, setExtendMinutes] = useState('3')
  const [asDraft, setAsDraft] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [productSearch, setProductSearch] = useState('')

  const selectedProduct = products.find((p) => p.id === productId)
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()),
  )

  function applyDuration(hours: number) {
    const start = startsAt ? new Date(startsAt) : new Date()
    if (!startsAt) setStartsAt(toLocalDatetime(start))
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000)
    setEndsAt(toLocalDatetime(end))
  }

  function setStartNow() {
    const now = new Date()
    now.setSeconds(0, 0)
    setStartsAt(toLocalDatetime(now))
  }

  function setStartTomorrow8am() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(8, 0, 0, 0)
    setStartsAt(toLocalDatetime(d))
  }

  async function handleSubmit(draft: boolean) {
    if (!productId) { setError('Vui lòng chọn sản phẩm'); return }
    if (!startPrice || !startsAt || !endsAt) { setError('Vui lòng điền đầy đủ thông tin bắt buộc'); return }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('Thời gian kết thúc phải sau thời gian bắt đầu'); return }

    setSubmitting(true)
    setAsDraft(draft)
    setError('')

    try {
      const res = await fetch('/api/v1/admin/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type: 'JAPANVIP_OWNED',
          startPrice: parseInt(startPrice),
          minIncrement: parseInt(minIncrement),
          reservePrice: reservePrice ? parseInt(reservePrice) : undefined,
          buyNowPrice: buyNowPrice ? parseInt(buyNowPrice) : undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          extendTrigger: parseInt(extendTrigger),
          extendMinutes: parseInt(extendMinutes),
          autoExtend: true,
          status: draft ? 'DRAFT' : 'SCHEDULED',
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/admin/auctions/${data.data.id}`)
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
    <div className="space-y-5 max-w-4xl">

      {/* 1. Product */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">1</span>
          Chọn Sản Phẩm
        </h2>

        <input
          type="text"
          placeholder="🔍  Tìm sản phẩm theo tên hoặc SKU..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className={`${inputCls} mb-3`}
        />

        {selectedProduct ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            {selectedProduct.images[0] && (
              <img src={selectedProduct.images[0].url} alt="" className="h-12 w-12 rounded-lg border border-gray-700 object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-100">{selectedProduct.name}</p>
              {selectedProduct.sku && <p className="text-xs text-gray-400">SKU: {selectedProduct.sku}</p>}
            </div>
            <button
              type="button"
              onClick={() => { setProductId(''); setProductSearch('') }}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
            >
              Thay đổi
            </button>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700/50">
            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Không tìm thấy sản phẩm</p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProductId(p.id); setProductSearch('') }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-700/50 transition-colors"
                >
                  {p.images[0] ? (
                    <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-lg border border-gray-700 object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 flex-shrink-0 text-gray-400">📦</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-200">{p.name}</p>
                    {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 2. Pricing */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span>
          Thiết Lập Giá
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Start price */}
          <div>
            <label className={labelCls}>Giá khởi điểm (₫) <span className="text-red-400">*</span></label>
            <input type="number" value={startPrice} onChange={(e) => setStartPrice(e.target.value)}
              placeholder="Nhập giá khởi điểm..." min={1} className={inputCls} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {START_PRESETS.map((p) => (
                <button key={p.value} type="button" onClick={() => setStartPrice(String(p.value))}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${startPrice === String(p.value) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min increment */}
          <div>
            <label className={labelCls}>Bước đặt giá tối thiểu (₫) <span className="text-red-400">*</span></label>
            <input type="number" value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)}
              min={1000} className={inputCls} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INCREMENT_PRESETS.map((p) => (
                <button key={p.value} type="button" onClick={() => setMinIncrement(String(p.value))}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${minIncrement === String(p.value) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reserve price */}
          <div>
            <label className={labelCls}>Giá bảo lưu (₫) <span className="text-gray-600 font-normal normal-case">tùy chọn</span></label>
            <input type="number" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)}
              placeholder="Để trống nếu không cần" min={1} className={inputCls} />
            <p className="mt-1.5 text-xs text-gray-500">Phiên chỉ thắng nếu giá đạt mức này</p>
          </div>

          {/* Buy now */}
          <div>
            <label className={labelCls}>Giá mua ngay (₫) <span className="text-gray-600 font-normal normal-case">tùy chọn</span></label>
            <input type="number" value={buyNowPrice} onChange={(e) => setBuyNowPrice(e.target.value)}
              placeholder="Để trống nếu không cần" min={1} className={inputCls} />
            <p className="mt-1.5 text-xs text-gray-500">Người dùng có thể mua ngay với giá này</p>
          </div>
        </div>

        {/* Price summary */}
        {(startPrice || minIncrement) && (
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-xs text-gray-400 space-y-1">
            {startPrice && <p>Giá khởi điểm: <span className="text-gray-200 font-semibold">{fmt(Number(startPrice))}</span></p>}
            {minIncrement && <p>Bước giá tối thiểu: <span className="text-gray-200 font-semibold">{fmt(Number(minIncrement))}</span></p>}
            {reservePrice && <p>Giá bảo lưu: <span className="text-yellow-400 font-semibold">{fmt(Number(reservePrice))}</span></p>}
            {buyNowPrice && <p>Giá mua ngay: <span className="text-green-400 font-semibold">{fmt(Number(buyNowPrice))}</span></p>}
          </div>
        )}
      </div>

      {/* 3. Schedule */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">3</span>
          Thời Gian
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bắt đầu <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={setStartNow}
                className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                Ngay bây giờ
              </button>
              <button type="button" onClick={setStartTomorrow8am}
                className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                Sáng mai 8:00
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Kết thúc <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((p) => (
                <button key={p.hours} type="button" onClick={() => applyDuration(p.hours)}
                  className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                  +{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {startsAt && endsAt && new Date(endsAt) > new Date(startsAt) && (
          <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-300">
            ⏱ Thời lượng:{' '}
            {(() => {
              const diff = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 1000 / 60
              if (diff < 60) return `${Math.round(diff)} phút`
              if (diff < 1440) return `${(diff / 60).toFixed(1)} giờ`
              return `${(diff / 1440).toFixed(1)} ngày`
            })()}
          </div>
        )}
      </div>

      {/* 4. Anti-snipe */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">4</span>
          Chống Snipe
          <span className="ml-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-medium text-yellow-400">Tự động</span>
        </h2>
        <p className="mb-4 text-xs text-gray-500">Tự động gia hạn phiên nếu có bid mới sát giờ kết thúc</p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Kích hoạt khi còn (phút)</label>
            <input type="number" value={extendTrigger} onChange={(e) => setExtendTrigger(e.target.value)}
              min={1} max={60} className={inputCls} />
            <div className="mt-2 flex gap-2">
              {[3, 5, 10, 15].map((v) => (
                <button key={v} type="button" onClick={() => setExtendTrigger(String(v))}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${extendTrigger === String(v) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {v} phút
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Gia hạn thêm (phút)</label>
            <input type="number" value={extendMinutes} onChange={(e) => setExtendMinutes(e.target.value)}
              min={1} max={30} className={inputCls} />
            <div className="mt-2 flex gap-2">
              {[3, 5, 10].map((v) => (
                <button key={v} type="button" onClick={() => setExtendMinutes(String(v))}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${extendMinutes === String(v) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {v} phút
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSubmit(false)}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
        >
          {submitting && !asDraft ? '⏳ Đang tạo...' : '🚀 Tạo & Lên lịch'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSubmit(true)}
          className="rounded-lg border border-gray-600 px-6 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-gray-100 disabled:opacity-50 transition-colors"
        >
          {submitting && asDraft ? '⏳ Đang lưu...' : '💾 Lưu bản nháp'}
        </button>
        <a href="/admin/auctions" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Hủy
        </a>
      </div>
    </div>
  )
}
