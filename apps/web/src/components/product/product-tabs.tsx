'use client'

import React, { useState } from 'react'
import { ProductDescription } from './product-description'

type Attribute = { id: string; name: string; value: string }
type SpecGroup = { group: string; items: Attribute[] }

type Props = {
  description: string | null
  attributes: Attribute[]
  specGroups: SpecGroup[]
  faqItems: Attribute[]
  videoItems: Attribute[]
  productId: string
  productName: string
}


// ── Sample reviews ───────────────────────────────────────────────────────────
const SAMPLE_REVIEWS = [
  {
    id: 1, stars: 5, name: 'Nguyễn Ngọc Hân', date: '28/05/2026',
    comment: 'Hài lòng nha, chia nhiều ngăn để được các loại thực phẩm khác nhau rất tiện lợi khi để vào và lấy ra mà không bị lẫn mùi.',
    images: [
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74X-X.jpg',
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74S.jpg',
    ],
  },
  {
    id: 2, stars: 5, name: 'Lương Thuý Nga', date: '19/05/2026',
    comment: 'Thấy bảo hành 24 tháng là mua ngay. Hàng nội địa Nhật nên cũng yên tâm. Nhân viên giao hàng chuyên nghiệp, tận tâm.',
    images: [
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74T-X.jpg',
    ],
  },
  {
    id: 3, stars: 5, name: 'Duy', date: '16/04/2026',
    comment: 'Tủ lớn để thoải mái đồ ăn luôn, rất hài lòng.',
    images: [
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74X-X-1-1280x720.jpg',
    ],
  },
  {
    id: 4, stars: 5, name: 'Nguyễn Đỗ Chương', date: '06/03/2026',
    comment: 'Giao hàng và tư vấn nhanh, vì mình cần gấp nên shop hỗ trợ nhiệt tình. Xài được hơn 1 tuần rồi nên đánh giá sơ bộ nè, tủ chạy êm (ko có tiếng ù ù luôn) mong là tiết kiệm điện!',
    images: [
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74X-X-2-1280x720.jpg',
    ],
  },
  {
    id: 5, stars: 5, name: 'Phan Văn Trường', date: '20/12/2025',
    comment: 'Các ngăn chứa rộng rãi, tính năng khử mùi tốt.',
    images: [
      'https://congnghenhat.com/wp-content/uploads/2025/08/Tu-lanh-Hitachi-R-WXC74X-X-3-1280x720.jpg',
    ],
  },
]

// ── YouTube helper ────────────────────────────────────────────────────────────
function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)
  return m?.[1] ?? null
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
function FaqAccordion({ items }: { items: Attribute[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <div key={item.id}>
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>{item.name}</span>
            <svg
              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open === item.id ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === item.id && (
            <div className="bg-gray-50 px-6 py-4 text-sm leading-relaxed text-gray-600">
              {item.value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Specs Table ───────────────────────────────────────────────────────────────
function SpecsTable({ attributes, specGroups }: { attributes: Attribute[]; specGroups: SpecGroup[] }) {
  const hasGroups = specGroups.length > 0
  const hasFlat = attributes.length > 0

  if (!hasGroups && !hasFlat) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        Chưa có thông số kỹ thuật cho sản phẩm này.
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {/* Ungrouped specs first */}
            {hasFlat && (() => {
              const PIN_TOP = ['thương hiệu', 'model', 'tình trạng']
              const sorted = [...attributes].sort((a, b) => {
                const na = a.name.replace(/^\[[^\]]+\]/, '').toLowerCase()
                const nb = b.name.replace(/^\[[^\]]+\]/, '').toLowerCase()
                const ia = PIN_TOP.indexOf(na)
                const ib = PIN_TOP.indexOf(nb)
                if (ia !== -1 && ib !== -1) return ia - ib
                if (ia !== -1) return -1
                if (ib !== -1) return 1
                return 0
              })
              return sorted.map((attr, i) => (
                <tr key={attr.id} className={i % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                  <td className="w-2/5 px-5 py-3 font-medium text-gray-500">{attr.name.replace(/^\[[^\]]+\]/, '')}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{attr.value}</td>
                </tr>
              ))
            })()}

            {/* Grouped specs */}
            {specGroups.map((grp) => (
              <React.Fragment key={`grp-${grp.group}`}>
                <tr className="bg-brand-red/5">
                  <td colSpan={2} className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-brand-red">
                    {grp.group}
                  </td>
                </tr>
                {grp.items.map((attr, i) => (
                  <tr key={attr.id} className={i % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="w-2/5 px-5 py-3 font-medium text-gray-500">{attr.name}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{attr.value}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Videos Section ────────────────────────────────────────────────────────────
function VideosSection({ items }: { items: Attribute[] }) {
  return (
    <div className="p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {items.map((item) => {
          const vid = getYoutubeId(item.value)
          if (!vid) return (
            <div key={item.id} className="rounded-xl border border-gray-100 p-4 text-sm text-gray-400">
              URL không hợp lệ: {item.value}
            </div>
          )
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${vid}`}
                  title={item.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              {item.name && (
                <div className="bg-gray-50 px-4 py-2.5">
                  <p className="text-xs font-semibold text-gray-700">{item.name}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ProductTabs({
  description, attributes, specGroups, faqItems, videoItems, productId, productName,
}: Props) {
  const hasDesc    = !!description
  const hasSpecs   = attributes.length > 0 || specGroups.length > 0
  const hasFaq     = faqItems.length > 0
  const hasVideos  = videoItems.length > 0

  type TabKey = 'desc' | 'specs' | 'videos' | 'faq'
  const defaultTab: TabKey = hasDesc ? 'desc' : hasSpecs ? 'specs' : hasVideos ? 'videos' : 'faq'
  const [tab, setTab] = useState<TabKey>(defaultTab)

  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reviewStar, setReviewStar] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [reviewName, setReviewName] = useState('')
  const [reviewComment, setReviewComment] = useState('')

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'desc',   label: 'Mô tả sản phẩm',       show: hasDesc },
    { key: 'specs',  label: 'Thông số kỹ thuật',     show: true },
    { key: 'videos', label: `Video (${videoItems.length})`, show: hasVideos },
    { key: 'faq',    label: `Hỏi & Đáp (${faqItems.length})`, show: hasFaq },
  ]

  if (!hasDesc && !hasSpecs && !hasFaq && !hasVideos) return null

  return (
    <section className="mt-12 space-y-12">
      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex flex-wrap border-b border-gray-100 bg-gray-50">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-4 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? 'border-brand-red text-brand-red bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'desc'   && hasDesc   && <ProductDescription description={description!} />}
        {tab === 'specs'  && <SpecsTable attributes={attributes} specGroups={specGroups} />}
        {tab === 'videos' && hasVideos && <VideosSection items={videoItems} />}
        {tab === 'faq'    && hasFaq    && (
          <div className="py-2">
            <FaqAccordion items={faqItems} />
          </div>
        )}
      </div>

      {/* ── Reviews ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Heading */}
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {SAMPLE_REVIEWS.length} đánh giá cho {productName}
          </h3>
        </div>

        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 px-5 pb-5 border-b border-gray-100">

          {/* Score */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-4xl font-extrabold text-yellow-500 leading-none">5.00</span>
            <span className="text-yellow-400 text-2xl">★</span>
          </div>

          {/* Bar chart */}
          <div className="flex-1 space-y-1.5">
            {[5,4,3,2,1].map((star) => (
              <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 shrink-0 font-medium">{star}</span>
                <span className="text-gray-400 shrink-0">★</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-red transition-all"
                    style={{ width: star === 5 ? '100%' : '0%' }} />
                </div>
                <span className="shrink-0 whitespace-nowrap text-right text-gray-400 w-16">
                  {star === 5 ? '5 đánh giá' : '0 đánh giá'}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="shrink-0">
            {submitted ? (
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-2 text-sm text-green-700">
                ✓ Cảm ơn! Đang chờ duyệt.
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition whitespace-nowrap"
              >
                Gửi đánh giá của bạn
              </button>
            )}
          </div>

        </div>

        {/* Write review form */}
        {showForm && !submitted && (
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Đánh giá của bạn</p>

            {/* Star selector */}
            <div className="flex items-center gap-1 mb-4">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setReviewStar(s)}
                  className="text-3xl leading-none transition-colors"
                  style={{ color: s <= (hoverStar || reviewStar) ? '#FBBF24' : '#D1D5DB' }}
                >
                  ★
                </button>
              ))}
              {reviewStar > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'][reviewStar]}
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="Họ tên của bạn"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-2 outline-none focus:border-brand-red"
            />
            <textarea
              placeholder="Nhận xét của bạn về sản phẩm..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3 outline-none focus:border-brand-red resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { if (reviewStar > 0 && reviewName.trim()) setSubmitted(true) }}
                disabled={reviewStar === 0 || !reviewName.trim()}
                className="rounded-lg bg-brand-red px-5 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-40"
              >
                Gửi đánh giá
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 transition"
              >
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* Review list */}
        <div className="divide-y divide-gray-50">
          {SAMPLE_REVIEWS.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-yellow-400 text-sm tracking-tight">{'★'.repeat(r.stars)}</span>
                <span className="font-semibold text-sm text-gray-900">{r.name}</span>
                <span className="text-gray-400 text-xs">— {r.date}</span>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Đã mua tại {productName ? 'japanvip.vn' : 'japanvip.vn'}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>
              {r.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover border border-gray-100 cursor-pointer hover:opacity-90"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
