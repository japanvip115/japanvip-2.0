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
  productImages?: string[]
  showReviews?: boolean
}


// ── Reviewer ngẫu nhiên THEO TỪNG SẢN PHẨM ──────────────────────────────────
// Seed xác định từ tên SP → mỗi SP có bộ tên/ngày riêng nhưng ỔN ĐỊNH (không
// dùng Math.random → tránh lỗi hydration server/client + không đổi mỗi lần load).
const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương', 'Lương', 'Mai']
const MIDDLES = ['Văn', 'Thị', 'Ngọc', 'Minh', 'Quốc', 'Thanh', 'Hoàng', 'Đức', 'Thuý', 'Gia', 'Hữu', 'Xuân', 'Bảo', 'Khánh', 'Phương', 'Hải', 'Kim', 'Diễm', 'Tuấn', 'Hồng']
const GIVENS = ['Hân', 'Nga', 'Duy', 'Trường', 'Chương', 'An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hương', 'Khoa', 'Lan', 'Linh', 'Long', 'Nam', 'Ngân', 'Như', 'Phúc', 'Quân', 'Quyên', 'Sơn', 'Thảo', 'Trang', 'Trí', 'Tú', 'Vy', 'Yến', 'Đạt']

function makeRng(productName: string): () => number {
  let h = 2166136261
  const s = productName || 'japanvip'
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  let a = h >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

// 4 kiểu tên: đầy đủ / Họ+Tên / Họ+Đệm (vd "Nguyễn Thuý") / chỉ Tên
function makeName(rng: () => number): string {
  const surname = pick(rng, SURNAMES)
  const middle = pick(rng, MIDDLES)
  const given = pick(rng, GIVENS)
  const r = rng()
  if (r < 0.45) return `${surname} ${middle} ${given}`
  if (r < 0.70) return `${surname} ${given}`
  if (r < 0.88) return `${surname} ${middle}`
  return given
}

const D2 = (n: number) => String(n).padStart(2, '0')

// Sinh n reviewer ổn định theo SP: tên không trùng + ngày giảm dần (gần đây → cũ)
function buildReviewers(productName: string, n = 5): { name: string; date: string }[] {
  const rng = makeRng(productName)
  const names: string[] = []
  let guard = 0
  while (names.length < n && guard++ < 100) {
    const nm = makeName(rng)
    if (!names.includes(nm)) names.push(nm)
  }

  // Ngày: bắt đầu lùi 10–40 ngày từ mốc 10/06/2026, mỗi review cách nhau 8–45 ngày
  let cursor = new Date(2026, 5, 10)
  cursor.setDate(cursor.getDate() - (10 + Math.floor(rng() * 30)))
  return names.map((name) => {
    const date = `${D2(cursor.getDate())}/${D2(cursor.getMonth() + 1)}/${cursor.getFullYear()}`
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - (8 + Math.floor(rng() * 37)))
    return { name, date }
  })
}

const REVIEW_COMMENTS: Record<string, string[]> = {
  fridge: [
    'Hài lòng nha, chia nhiều ngăn để được các loại thực phẩm khác nhau rất tiện, để vào lấy ra không bị lẫn mùi.',
    'Thấy bảo hành 24 tháng là mua ngay. Hàng nội địa Nhật nên cũng yên tâm. Nhân viên giao hàng chuyên nghiệp, tận tâm.',
    'Tủ lớn để thoải mái đồ ăn luôn, chạy êm không ù ù, rất hài lòng.',
    'Giao hàng và tư vấn nhanh, mình cần gấp nên shop hỗ trợ nhiệt tình. Xài hơn 1 tuần rồi, tủ chạy êm, mong tiết kiệm điện!',
    'Các ngăn chứa rộng rãi, làm lạnh nhanh, tính năng khử mùi tốt.',
  ],
  bathroom: [
    'Nắp đóng mở êm nhẹ, vòi rửa mạnh mà không bắn nước. Hàng Nhật xài thích thật.',
    'Thấy bảo hành 24 tháng là đặt ngay. Lắp đặt nhanh, nhân viên tư vấn nhiệt tình.',
    'Nhiều chế độ rửa, nước ấm ổn định, vệ sinh sạch sẽ, rất hài lòng.',
    'Giao hàng và tư vấn nhanh, shop hỗ trợ tận tình. Dùng hơn tuần rồi, vận hành êm, tiết kiệm nước.',
    'Chất liệu chắc chắn, khử mùi tốt, đúng chất hàng nội địa Nhật.',
  ],
  air_purifier: [
    'Máy chạy êm, lọc nhanh, phòng đỡ mùi hẳn. Hàng nội địa Nhật xài yên tâm.',
    'Bảo hành 24 tháng nên mua liền. Giao hàng tận tâm, đóng gói cẩn thận.',
    'Cảm biến nhạy, tự tăng giảm theo không khí, ban đêm chạy êm ngủ ngon.',
    'Tư vấn nhanh, cần gấp giao vẫn kịp. Dùng tuần rồi thấy nhẹ mũi hơn, mong tiết kiệm điện.',
    'Thiết kế gọn, tạo ẩm tốt, lọc bụi mịn ổn. Rất hài lòng.',
  ],
  kitchen: [
    'Nấu nhanh, nhiều chế độ tự động tiện thật. Hàng Nhật bền, đáng tiền.',
    'Bảo hành 24 tháng là yên tâm. Giao hàng nhanh, nhân viên tư vấn nhiệt tình.',
    'Làm chín đều, dễ vệ sinh, dùng hằng ngày rất ổn.',
    'Tư vấn kỹ, cần gấp giao vẫn kịp. Xài tuần rồi thấy chạy êm, tiết kiệm điện.',
    'Thiết kế đẹp, vận hành êm, đúng chất lượng hàng nội địa Nhật.',
  ],
  washer: [
    'Giặt sạch, vắt khô êm, ít ồn. Hàng nội địa Nhật xài thích.',
    'Bảo hành 24 tháng là đặt liền. Giao lắp tận nơi, chuyên nghiệp.',
    'Nhiều chế độ giặt, tiết kiệm nước, quần áo thơm sạch.',
    'Giao nhanh, tư vấn tốt. Dùng tuần rồi máy chạy êm, mong tiết kiệm điện.',
    'Lồng giặt rộng, vận hành ổn định, rất hài lòng.',
  ],
  climate: [
    'Làm mát/ấm nhanh, chạy êm, tiết kiệm điện. Hàng Nhật xài yên tâm.',
    'Bảo hành 24 tháng nên mua ngay. Giao hàng nhanh, tận tâm.',
    'Nhiều chế độ, cảm biến nhạy, dùng cả ngày vẫn ổn.',
    'Tư vấn nhanh, cần gấp giao kịp. Xài tuần rồi thấy êm và tiết kiệm.',
    'Thiết kế gọn, vận hành êm, đúng chất lượng nội địa Nhật.',
  ],
  generic: [
    'Hàng nội địa Nhật mới 100%, đóng gói cẩn thận, đúng mô tả. Rất hài lòng.',
    'Thấy bảo hành 24 tháng là yên tâm đặt. Nhân viên giao hàng chuyên nghiệp, tận tâm.',
    'Sản phẩm chất lượng, vận hành êm, dùng rất thích.',
    'Giao hàng và tư vấn nhanh, shop hỗ trợ nhiệt tình. Sẽ ủng hộ tiếp.',
    'Đúng hàng chính hãng Nhật, đáng tiền, recommend cho mọi người.',
  ],
}

function detectCategory(productName: string): string {
  const n = (productName ?? '').toLowerCase()
  if (/tủ lạnh/.test(n)) return 'fridge'
  if (/nắp (bệt|rửa)|bồn cầu|vòi|sen tắm|bidet|toilet|chậu rửa|vệ sinh/.test(n)) return 'bathroom'
  if (/lọc không khí|lọc khí|hút ẩm|tạo ẩm|lọc nước/.test(n)) return 'air_purifier'
  if (/máy giặt/.test(n)) return 'washer'
  if (/lò vi sóng|nồi cơm|nồi chiên|bếp từ|bếp ga|máy rửa bát|ấm|máy xay/.test(n)) return 'kitchen'
  if (/quạt|máy sưởi|điều hòa|máy lạnh/.test(n)) return 'climate'
  return 'generic'
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function nameHash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function buildReviews(productName: string, productImages: string[]) {
  const comments = REVIEW_COMMENTS[detectCategory(productName)] ?? REVIEW_COMMENTS.generic!
  const reviewers = buildReviewers(productName, comments.length)
  const unique = [...new Set(productImages.filter(Boolean))]
  let imgIdx = 0
  return reviewers.map((r, i) => {
    const wantImage = i === 0 || i === 2 || i === 4
    const img = wantImage && imgIdx < unique.length ? unique[imgIdx++]! : null
    return {
      id: i + 1,
      stars: 5,
      name: r.name,
      initials: getInitials(r.name),
      date: r.date,
      comment: comments[i] ?? comments[0]!,
      images: img ? [img] : [],
      helpful: 5 + (nameHash(r.name) % 28),
    }
  })
}

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
// 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
// Thứ tự nhóm thông số cố định TOÀN SITE: Thông tin chung → Thông số kỹ thuật → Phụ kiện → Kích thước & Trọng lượng → Vận hành.
// Nhóm khác (công nghệ/tính năng...) xếp sau Thông số kỹ thuật. Sort stable: nhóm cùng hạng giữ thứ tự gốc.
function groupRank(g: string): number {
  const s = g.toLowerCase()
  if (s.includes('thông tin')) return 1
  if (s.includes('thông số')) return 2
  if (s.includes('phụ kiện')) return 3
  if (s.includes('kích thước') || s.includes('trọng lượng')) return 4
  if (s.includes('vận hành')) return 5
  return 2.5
}

function SpecsTable({ attributes, specGroups }: { attributes: Attribute[]; specGroups: SpecGroup[] }) {
  const hasGroups = specGroups.length > 0
  const hasFlat = attributes.length > 0
  const orderedGroups = [...specGroups].sort((a, b) => groupRank(a.group) - groupRank(b.group))

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

            {/* Grouped specs (thứ tự cố định toàn site) */}
            {orderedGroups.map((grp) => (
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
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        Chưa có video thực tế cho sản phẩm này.
      </div>
    )
  }
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
  description, attributes, specGroups, faqItems, videoItems, productId, productName, productImages = [], showReviews = true,
}: Props) {
  const reviews = buildReviews(productName, productImages)
  const ratingDisplay = (() => {
    const opts = [4.7, 4.8, 4.9, 5.0]
    const rng = makeRng(productName + '__rating')
    return opts[Math.floor(rng() * opts.length)]!
  })()
  const [showAllReviews, setShowAllReviews] = useState(false)
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3)
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
    { key: 'videos', label: 'Video thực tế', show: true },
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
        {tab === 'videos' && <VideosSection items={videoItems} />}
        {tab === 'faq'    && hasFaq    && (
          <div className="py-2">
            <FaqAccordion items={faqItems} />
          </div>
        )}
      </div>

      {/* ── Reviews ── (ẩn khi admin tắt công tắc đánh giá SP) */}
      {showReviews && (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Heading */}
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {reviews.length} đánh giá cho {productName}
          </h3>
        </div>

        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 px-5 pb-5 border-b border-gray-100">

          {/* Score */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-4xl font-extrabold text-yellow-500 leading-none">{ratingDisplay.toFixed(2)}</span>
            <span className="text-yellow-400 text-2xl">★</span>
          </div>

          {/* Bar chart */}
          <div className="flex-1 space-y-1.5">
            {[5,4,3,2,1].map((star) => {
              const fiveStarCount = ratingDisplay === 5.0 ? reviews.length : Math.round(reviews.length * 0.8)
              const fourStarCount = ratingDisplay < 5.0 ? reviews.length - fiveStarCount : 0
              const count = star === 5 ? fiveStarCount : star === 4 ? fourStarCount : 0
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2 shrink-0 font-medium">{star}</span>
                  <span className="text-gray-400 shrink-0">★</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-red transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-right text-gray-400 w-16">
                    {count > 0 ? `${count} đánh giá` : '0 đánh giá'}
                  </span>
                </div>
              )
            })}
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
                className="rounded-xl border-2 border-solid border-brand-red bg-white px-6 py-3 text-sm font-bold text-brand-red hover:bg-brand-red hover:text-white transition-colors whitespace-nowrap"
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
          {visibleReviews.map((r) => (
            <div key={r.id} className="px-5 py-4">
              {/* Header: avatar + name/stars + date */}
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-brand-red flex items-center justify-center text-white text-xs font-bold">
                  {r.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-gray-900">{r.name}</strong>
                    <span className="text-xs text-gray-400 shrink-0">{r.date}</span>
                  </div>
                  <span className="text-yellow-400 text-xs tracking-tight">{'★'.repeat(r.stars)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{r.comment}</p>
              {r.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
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
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-red transition-colors">
                  👍 Hữu ích ({r.helpful})
                </button>
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Đã mua tại japanvip.vn
                </span>
              </div>
            </div>
          ))}
        </div>

        {reviews.length > 3 && (
          <div className="px-5 py-4 border-t border-gray-50 text-center">
            <button
              type="button"
              onClick={() => setShowAllReviews((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline"
            >
              {showAllReviews ? 'Thu gọn ▲' : `Xem thêm ${reviews.length - 3} đánh giá ▼`}
            </button>
          </div>
        )}
      </div>
      )}
    </section>
  )
}
