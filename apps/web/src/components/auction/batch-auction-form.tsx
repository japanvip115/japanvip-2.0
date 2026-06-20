'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  images: { url: string }[]
  brand: string
  category: string
}

const CONDITION_PRESETS = [
  'Mới 100% còn nguyên seal',
  'Mới 100% đã khui hộp kiểm tra',
  'Như mới — đã qua sử dụng, không có vết xước',
  'Tình trạng tốt — có vết xước nhỏ, không ảnh hưởng chức năng',
  'Tình trạng khá — có vết dùng, hoạt động tốt',
]

const DURATION_PRESETS = [
  { label: '1 giờ', hours: 1 },
  { label: '3 giờ', hours: 3 },
  { label: '6 giờ', hours: 6 },
  { label: '12 giờ', hours: 12 },
  { label: '24 giờ', hours: 24 },
  { label: '3 ngày', hours: 72 },
  { label: '7 ngày', hours: 168 },
]

const INCREMENT_PRESETS = [
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
]

const START_PRESETS = [
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 },
  { label: '20M', value: 20000000 },
  { label: '50M', value: 50000000 },
]

function toLocalDatetime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'
const cardCls = 'rounded-xl border border-gray-700 bg-gray-800/60 p-5'
const sectionTitle = 'mb-4 flex items-center gap-2 text-sm font-bold text-gray-100'

export function BatchAuctionForm({ products }: { products: Product[] }) {
  const router = useRouter()

  // Step: 'config' | 'lots' | 'done'
  const [step, setStep] = useState<'config' | 'lots' | 'done'>('config')

  // Step 1 — config
  const [productId, setProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [quantity, setQuantity] = useState('3')
  const [startPrice, setStartPrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('100000')
  const [reservePrice, setReservePrice] = useState('')
  const [buyNowPrice, setBuyNowPrice] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [extendTrigger, setExtendTrigger] = useState('3')
  const [extendMinutes, setExtendMinutes] = useState('3')

  // Step 2 — per-lot conditions
  const [conditions, setConditions] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdAuctions, setCreatedAuctions] = useState<{ id: string; auctionNumber: string }[]>([])

  const selectedProduct = products.find((p) => p.id === productId)
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase()),
  )

  function applyDuration(hours: number) {
    const start = startsAt ? new Date(startsAt) : new Date()
    if (!startsAt) setStartsAt(toLocalDatetime(start))
    setEndsAt(toLocalDatetime(new Date(start.getTime() + hours * 3600000)))
  }

  function goToLots() {
    if (!productId) { setError('Vui lòng chọn sản phẩm'); return }
    if (!startPrice) { setError('Vui lòng nhập giá khởi điểm'); return }
    if (!startsAt || !endsAt) { setError('Vui lòng chọn thời gian'); return }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('Thời gian kết thúc phải sau bắt đầu'); return }
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1 || qty > 50) { setError('Số lượng 1–50 lot'); return }
    setError('')
    setConditions(Array.from({ length: qty }, () => 'Mới 100% còn nguyên seal'))
    setStep('lots')
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/v1/admin/auctions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: parseInt(quantity),
          startPrice: parseInt(startPrice),
          minIncrement: parseInt(minIncrement),
          reservePrice: reservePrice ? parseInt(reservePrice) : undefined,
          buyNowPrice: buyNowPrice ? parseInt(buyNowPrice) : undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          extendTrigger: parseInt(extendTrigger),
          extendMinutes: parseInt(extendMinutes),
          unitConditions: conditions,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreatedAuctions(data.data.auctions)
        setStep('done')
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── STEP: DONE ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className={`${cardCls} max-w-2xl`}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xl">✓</div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Đã tạo {createdAuctions.length} lot thành công!</h2>
            <p className="text-sm text-gray-500">Tất cả ở trạng thái DRAFT — vào từng lot để upload ảnh thực tế trước khi publish</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto mb-6">
          {createdAuctions.map((a, i) => (
            <a
              key={a.id}
              href={`/admin/auctions/${a.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 hover:border-gray-500 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-mono font-medium text-gray-200">{a.auctionNumber}</p>
                  <p className="text-xs text-gray-500">{conditions[i]}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-red-400 transition-colors">Mở →</span>
            </a>
          ))}
        </div>

        <div className="flex gap-3">
          <a
            href="/admin/auctions"
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors"
          >
            Xem danh sách đấu giá
          </a>
          <button
            onClick={() => { setStep('config'); setProductId(''); setQuantity('3'); setStartPrice(''); setStartsAt(''); setEndsAt('') }}
            className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm text-gray-300 hover:border-gray-400 transition-colors"
          >
            Nhập lô mới
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: LOTS ──────────────────────────────────────────────────────────────
  if (step === 'lots') {
    return (
      <div className="max-w-3xl space-y-5">
        {/* Summary */}
        <div className={cardCls}>
          <div className="flex items-start gap-4">
            {selectedProduct?.images[0] && (
              <img src={selectedProduct.images[0].url} alt="" className="h-16 w-16 rounded-xl border border-gray-700 object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-100">{selectedProduct?.name}</p>
              <p className="text-xs text-gray-500">{selectedProduct?.brand} · {selectedProduct?.category}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                <span>Giá khởi điểm: <strong className="text-gray-200">{fmt(parseInt(startPrice))}</strong></span>
                <span>Bước giá: <strong className="text-gray-200">{fmt(parseInt(minIncrement))}</strong></span>
                <span>Thời lượng: <strong className="text-gray-200">
                  {(() => {
                    const diff = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000
                    if (diff < 60) return `${Math.round(diff)} phút`
                    if (diff < 1440) return `${(diff / 60).toFixed(1)} giờ`
                    return `${(diff / 1440).toFixed(1)} ngày`
                  })()}
                </strong></span>
              </div>
            </div>
            <button
              onClick={() => setStep('config')}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              ← Sửa
            </button>
          </div>
        </div>

        {/* Per-lot conditions */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span>
            Tình Trạng Từng Lot ({conditions.length} lot)
          </h2>
          <p className="mb-4 text-xs text-gray-500">Mô tả tình trạng thực tế của từng đơn vị hàng. Ảnh thực tế upload sau khi tạo.</p>

          {/* Apply all */}
          <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900/40 p-3">
            <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Áp dụng nhanh cho tất cả</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConditions(conditions.map(() => c))}
                  className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-2.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={cond ?? ''}
                    onChange={(e) => {
                      const next = [...conditions]
                      next[i] = e.target.value
                      setConditions(next)
                    }}
                    placeholder="Mô tả tình trạng..."
                    className={inputCls}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {CONDITION_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const next = [...conditions]
                          next[i] = c
                          setConditions(next)
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] transition-colors ${(cond ?? '') === c ? 'bg-red-600/30 text-red-400 border border-red-600/40' : 'border border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'}`}
                      >
                        {(c.split('—')[0] ?? c).trim()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        <div className="flex items-center gap-3 pb-4">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? '⏳ Đang tạo...' : `💾 Tạo ${conditions.length} lot DRAFT`}
          </button>
          <button
            onClick={() => setStep('config')}
            className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-400 transition-colors"
          >
            ← Quay lại
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: CONFIG ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-5">

      {/* 1. Product + quantity */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">1</span>
          Chọn Sản Phẩm & Số Lượng Lot
        </h2>

        <input
          type="text"
          placeholder="🔍  Tìm sản phẩm theo tên hoặc thương hiệu..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className={`${inputCls} mb-3`}
        />

        {selectedProduct ? (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            {selectedProduct.images[0] && (
              <img src={selectedProduct.images[0].url} alt="" className="h-12 w-12 rounded-lg border border-gray-700 object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-100">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500">{selectedProduct.brand} · {selectedProduct.category}</p>
            </div>
            <button
              type="button"
              onClick={() => { setProductId(''); setProductSearch('') }}
              className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
            >
              Thay đổi
            </button>
          </div>
        ) : (
          <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700/50">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 flex-shrink-0 text-gray-400 text-lg">📦</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.brand} · {p.category}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <div className="max-w-xs">
          <label className={labelCls}>Số lượng lot cần tạo <span className="text-red-400">*</span></label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min={1}
            max={50}
            className={inputCls}
          />
          <div className="mt-2 flex gap-2">
            {[2, 3, 5, 10, 20].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setQuantity(String(v))}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${quantity === String(v) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}
              >
                {v} lot
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">Tối đa 50 lot / lần nhập</p>
        </div>
      </div>

      {/* 2. Pricing */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span>
          Giá (Áp dụng đồng đều cho tất cả lot)
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

          <div>
            <label className={labelCls}>Bước đặt giá tối thiểu (₫)</label>
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

          <div>
            <label className={labelCls}>Giá bảo lưu (₫) <span className="text-gray-600 font-normal normal-case">tùy chọn</span></label>
            <input type="number" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)}
              placeholder="Để trống nếu không cần" min={1} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Giá mua ngay (₫) <span className="text-gray-600 font-normal normal-case">tùy chọn</span></label>
            <input type="number" value={buyNowPrice} onChange={(e) => setBuyNowPrice(e.target.value)}
              placeholder="Để trống nếu không cần" min={1} className={inputCls} />
          </div>
        </div>
      </div>

      {/* 3. Schedule */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">3</span>
          Thời Gian (Áp dụng đồng đều cho tất cả lot)
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bắt đầu <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => { const n = new Date(); n.setSeconds(0, 0); setStartsAt(toLocalDatetime(n)) }}
                className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                Ngay bây giờ
              </button>
              <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); setStartsAt(toLocalDatetime(d)) }}
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
      </div>

      {/* 4. Anti-snipe */}
      <div className={cardCls}>
        <h2 className={sectionTitle}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">4</span>
          Chống Snipe
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Kích hoạt khi còn (phút)</label>
            <div className="flex gap-2">
              {[3, 5, 10, 15].map((v) => (
                <button key={v} type="button" onClick={() => setExtendTrigger(String(v))}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${extendTrigger === String(v) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {v} phút
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Gia hạn thêm (phút)</label>
            <div className="flex gap-2">
              {[3, 5, 10].map((v) => (
                <button key={v} type="button" onClick={() => setExtendMinutes(String(v))}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${extendMinutes === String(v) ? 'bg-red-600 text-white' : 'border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {v} phút
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="flex items-center gap-3 pb-4">
        <button
          type="button"
          onClick={goToLots}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors"
        >
          Tiếp theo: Nhập tình trạng từng lot →
        </button>
        <a href="/admin/auctions" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Hủy
        </a>
      </div>
    </div>
  )
}
