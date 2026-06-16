'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

type Props = {
  productId: string
  initialSalePrice: number | null
  initialMarketPrice: number | null
  initialRating?: number | null
  initialReviewCount?: number
}

export function ProductPriceForm({ productId, initialSalePrice, initialMarketPrice, initialRating, initialReviewCount }: Props) {
  const [salePrice, setSalePrice] = useState(initialSalePrice != null ? String(initialSalePrice) : '')
  const [marketPrice, setMarketPrice] = useState(initialMarketPrice != null ? String(initialMarketPrice) : '')
  const [rating, setRating] = useState(initialRating != null ? String(initialRating) : '')
  const [reviewCount, setReviewCount] = useState(initialReviewCount != null ? String(initialReviewCount) : '0')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const discount = salePrice && marketPrice && Number(marketPrice) > Number(salePrice)
    ? Math.round((1 - Number(salePrice) / Number(marketPrice)) * 100)
    : null

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePrice: salePrice ? Number(salePrice) : null,
          marketPrice: marketPrice ? Number(marketPrice) : null,
          rating: rating ? Number(rating) : null,
          reviewCount: reviewCount ? Number(reviewCount) : 0,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Giá bán</h3>
        {discount && (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400 ring-1 ring-inset ring-green-500/20">
            -{discount}% tiết kiệm
          </span>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>
          Giá bán <span className="normal-case font-normal text-gray-600">(VNĐ)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={salePrice ? Number(salePrice).toLocaleString('vi-VN') : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/\./g, '').replace(/,/g, '')
              if (raw === '' || /^\d+$/.test(raw)) setSalePrice(raw)
            }}
            placeholder="5.990.000"
            className={`${INPUT_CLS} pr-8`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
        </div>
        {salePrice && (
          <p className="mt-1 text-xs font-semibold text-red-400">{Number(salePrice).toLocaleString('vi-VN')} ₫</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLS}>
          Giá thị trường <span className="normal-case font-normal text-gray-600">(VNĐ)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={marketPrice ? Number(marketPrice).toLocaleString('vi-VN') : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/\./g, '').replace(/,/g, '')
              if (raw === '' || /^\d+$/.test(raw)) setMarketPrice(raw)
            }}
            placeholder="7.500.000"
            className={`${INPUT_CLS} pr-8`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
        </div>
        {marketPrice && (
          <p className="mt-1 text-xs text-gray-500 line-through">{Number(marketPrice).toLocaleString('vi-VN')} ₫</p>
        )}
      </div>

      {(salePrice || marketPrice) && (
        <div className="rounded-lg border border-gray-700/60 bg-gray-900/50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-600">Xem trước</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            {salePrice ? (
              <span className="text-lg font-bold text-red-400">{Number(salePrice).toLocaleString('vi-VN')} ₫</span>
            ) : (
              <span className="text-sm italic text-gray-600">Liên hệ để biết giá</span>
            )}
            {marketPrice && salePrice && Number(marketPrice) > Number(salePrice) && (
              <>
                <span className="text-xs text-gray-600 line-through">{Number(marketPrice).toLocaleString('vi-VN')} ₫</span>
                <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-xs font-bold text-red-400">-{discount}%</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rating */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Đánh giá hiển thị</h4>
        {/* Star picker */}
        <div>
          <label className={LABEL_CLS}>Số sao</label>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(String(s))}
                className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${Number(rating) >= s ? 'text-yellow-400' : 'text-gray-700'}`}
              >★</button>
            ))}
            {rating && <span className="ml-1 self-center text-xs text-gray-400">{Number(rating).toFixed(1)}</span>}
          </div>
          {/* Half-star row */}
          <div className="flex gap-1 flex-wrap">
            {[4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(String(v))}
                className={`rounded px-2 py-0.5 text-xs cursor-pointer transition-colors ${Number(rating) === v ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40' : 'bg-gray-800 text-gray-500 hover:text-yellow-400'}`}
              >{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Số lượt đánh giá</label>
          <input
            type="number"
            min="0"
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="128"
            className={INPUT_CLS}
          />
        </div>
      </div>

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
          'Lưu giá'
        )}
      </button>
    </div>
  )
}
