'use client'

import { useState } from 'react'
import { ProductDescription } from './product-description'

type Attribute = { id: string; name: string; value: string }

type Props = {
  description: string | null
  attributes: Attribute[]
  productId: string
  productName: string
}

const STAR_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc']

type ReviewForm = { name: string; rating: number; comment: string }

export function ProductTabs({ description, attributes, productId, productName }: Props) {
  const [tab, setTab] = useState<'desc' | 'specs'>(description ? 'desc' : 'specs')
  const [hoveredStar, setHoveredStar] = useState(0)
  const [form, setForm] = useState<ReviewForm>({ name: '', rating: 5, comment: '' })
  const [submitted, setSubmitted] = useState(false)

  const hasDesc = !!description
  const hasSpecs = attributes.length > 0

  if (!hasDesc && !hasSpecs) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="mt-12 space-y-12">
      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {hasDesc && (
            <button
              onClick={() => setTab('desc')}
              className={`px-6 py-4 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === 'desc'
                  ? 'border-brand-red text-brand-red bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              Mô tả sản phẩm
            </button>
          )}
          <button
            onClick={() => setTab('specs')}
            className={`px-6 py-4 text-sm font-semibold transition-all border-b-2 -mb-px ${
              tab === 'specs'
                ? 'border-brand-red text-brand-red bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'
            }`}
          >
            Thông số kỹ thuật
          </button>
        </div>

        {/* Description */}
        {tab === 'desc' && hasDesc && (
          <ProductDescription description={description!} />
        )}

        {/* Specs */}
        {tab === 'specs' && (
          hasSpecs ? (
            <div className="p-6 lg:p-8">
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {attributes.map((attr, i) => (
                      <tr key={attr.id} className={i % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                        <td className="px-5 py-3 font-medium text-gray-500 w-2/5">{attr.name}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{attr.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">Chưa có thông số kỹ thuật cho sản phẩm này.</div>
          )
        )}
      </div>

      {/* ── Reviews ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Đánh giá từ khách hàng</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Cột trái — Tổng quan */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-5xl font-extrabold text-gray-900 leading-none">5.0</span>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">1 đánh giá</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[5,4,3,2,1].map((star) => (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-2 text-gray-500 font-medium shrink-0">{star}</span>
                  <span className="text-yellow-400 text-sm shrink-0">★</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all"
                      style={{ width: star === 5 ? '100%' : '0%' }}
                    />
                  </div>
                  <span className="text-gray-400 w-8 text-right shrink-0">{star === 5 ? '100%' : '0%'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải — Form viết đánh giá */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col">
            {submitted ? (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700">
                <span className="text-green-500 text-lg">✓</span>
                Cảm ơn bạn đã đánh giá! Nhận xét đang chờ duyệt.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-3">
                {/* Tiêu đề + sao ngang hàng */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900">Viết đánh giá của bạn</h3>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHoveredStar(s)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setForm((f) => ({ ...f, rating: s }))}
                        className={`text-xl leading-none transition-transform hover:scale-110 ${
                          s <= (hoveredStar || form.rating) ? 'text-yellow-400' : 'text-gray-200'
                        }`}
                      >★</button>
                    ))}
                    {(hoveredStar || form.rating) > 0 && (
                      <span className="ml-1 text-xs font-medium text-gray-400">
                        {STAR_LABELS[hoveredStar || form.rating]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition"
                  />
                </div>

                <div className="flex flex-col flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nhận xét</label>
                  <textarea
                    required
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder={`Chia sẻ trải nghiệm của bạn về ${productName}...`}
                    className="flex-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition resize-none min-h-[80px]"
                  />
                </div>

                <button
                  type="submit"
                  className="self-start rounded-xl bg-brand-red px-5 py-2 text-sm font-bold text-white hover:bg-red-700 transition shadow-sm shadow-red-200"
                >
                  Gửi đánh giá
                </button>
              </form>
            )}
          </div>

        </div>{/* end grid */}
      </div>
    </section>
  )
}
