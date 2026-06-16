'use client'

import { useState } from 'react'

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
  const [collapsed, setCollapsed] = useState(true)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [form, setForm] = useState<ReviewForm>({ name: '', rating: 5, comment: '' })
  const [submitted, setSubmitted] = useState(false)

  const hasDesc = !!description
  const hasSpecs = attributes.length > 0
  const COLLAPSE_HEIGHT = 600

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
          <div className="p-6 lg:p-8">
            <div
              className="relative overflow-hidden transition-all duration-500"
              style={{ maxHeight: collapsed ? `${COLLAPSE_HEIGHT}px` : undefined }}
            >
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-7
                  [&_p]:mb-4 [&_p]:leading-7
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:mb-1.5
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                  [&_strong]:font-semibold [&_strong]:text-gray-900
                  [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-6 [&_h1]:mb-3
                  [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-6 [&_h2]:mb-3
                  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-2
                  [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mt-3 [&_h4]:mb-1
                  [&_table]:w-full [&_table]:border-collapse [&_table]:mb-6 [&_table]:text-sm [&_table]:rounded-xl [&_table]:overflow-hidden
                  [&_td]:border [&_td]:border-gray-100 [&_td]:px-4 [&_td]:py-2.5
                  [&_th]:border [&_th]:border-gray-100 [&_th]:px-4 [&_th]:py-2.5 [&_th]:bg-gray-50 [&_th]:font-semibold [&_th]:text-left
                  [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-sm
                  [&_a]:text-brand-red [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: description! }}
              />
              {collapsed && (
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:border-brand-red hover:text-brand-red transition"
              >
                {collapsed ? <>Xem thêm <span className="text-xs">▼</span></> : <>Thu gọn <span className="text-xs">▲</span></>}
              </button>
            </div>
          </div>
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

        {/* Summary */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-2xl border border-gray-100 bg-gray-50 mb-6 max-w-2xl">
          <div className="flex flex-col items-center justify-center min-w-[100px] gap-1">
            <span className="text-5xl font-extrabold text-gray-900 leading-none">5.0</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className="text-yellow-400 text-base">★</span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">1 đánh giá</p>
          </div>

          <div className="w-px bg-gray-200 hidden sm:block" />

          <div className="flex-1 space-y-2 justify-center flex flex-col">
            {[5,4,3,2,1].map((star) => (
              <div key={star} className="flex items-center gap-2.5 text-xs">
                <span className="w-3 text-right text-gray-500 font-medium">{star}</span>
                <span className="text-yellow-400 text-sm">★</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{ width: star === 5 ? '100%' : '0%' }}
                  />
                </div>
                <span className="text-gray-400 w-10 text-right">{star === 5 ? '100%' : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Write review */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 lg:p-8">
          <h3 className="text-base font-bold text-gray-900 mb-5">Viết đánh giá của bạn</h3>
          {submitted ? (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700">
              <span className="text-green-500 text-lg">✓</span>
              Cảm ơn bạn đã đánh giá! Nhận xét đang chờ duyệt.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Số sao</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setForm((f) => ({ ...f, rating: s }))}
                      className={`text-3xl leading-none transition-transform hover:scale-110 ${
                        s <= (hoveredStar || form.rating) ? 'text-yellow-400' : 'text-gray-200'
                      }`}
                    >★</button>
                  ))}
                  {(hoveredStar || form.rating) > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-500">
                      {STAR_LABELS[hoveredStar || form.rating]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nhận xét</label>
                <textarea
                  required
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  placeholder={`Chia sẻ trải nghiệm của bạn về ${productName}...`}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-brand-red px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition shadow-sm shadow-red-200"
              >
                Gửi đánh giá
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
