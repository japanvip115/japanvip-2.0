'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Script from 'next/script'
import Image from 'next/image'
import { QuickOrderModal } from '@/components/product/quick-order-modal'

function CountUp({ end, decimals = 0, suffix = '' }: { end: number; decimals?: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      observer.disconnect()
      const duration = 1800
      const start = performance.now()
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(parseFloat((eased * end).toFixed(decimals)))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, decimals])
  return <span ref={ref}>{decimals > 0 ? value.toFixed(decimals) : value.toLocaleString('vi-VN')}{suffix}</span>
}

const CAT_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #30cfd0, #330867)',
]

function getCatEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('nồi') || n.includes('cơm')) return '🍚'
  if (n.includes('lọc') && (n.includes('khí') || n.includes('kk'))) return '💨'
  if (n.includes('lọc') && n.includes('nước')) return '💧'
  if (n.includes('vệ sinh') || n.includes('bồn')) return '🚿'
  if (n.includes('hút bụi') || n.includes('robot')) return '🤖'
  if (n.includes('cà phê') || n.includes('pha')) return '☕'
  if (n.includes('vi sóng') || n.includes('lò')) return '🌀'
  if (n.includes('thông minh') || n.includes('smarthome')) return '🏠'
  if (n.includes('giặt')) return '🫧'
  if (n.includes('lạnh') || n.includes('tủ lạnh')) return '🧊'
  if (n.includes('điều hòa') || n.includes('máy lạnh')) return '❄️'
  if (n.includes('sưởi')) return '🔥'
  if (n.includes('bếp')) return '🍳'
  if (n.includes('máy sấy') || n.includes('sấy')) return '💨'
  if (n.includes('âm thanh') || n.includes('loa')) return '🔊'
  return '📦'
}

export type CategoryItem = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  _count: { products: number }
  children?: { _count: { products: number } }[]
}

export type ProductItem = {
  id: string
  name: string
  slug: string
  originPrice: number | null
  salePrice: number | null
  marketPrice: number | null
  condition: string
  badge: string | null
  brand: { name: string } | null
  category: { name: string; slug: string } | null
  images: { url: string }[]
}

export type AuctionItem = {
  id: string
  auctionNumber: string
  currentPrice: number
  bidCount: number
  endsAt: string
  minIncrement: number
  product: {
    name: string
    slug: string
    brand: { name: string } | null
    images: { url: string }[]
  }
}

function AuctionCountdown({ endsAt }: { endsAt: string }) {
  const [rem, setRem] = useState<number | null>(null)

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
    setRem(calc())
    const id = setInterval(() => setRem(calc()), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (rem === null) return <div className="countdown" />

  const urgent = rem < 3600
  const days = Math.floor(rem / 86400)

  if (days >= 1) {
    const h = Math.floor((rem % 86400) / 3600)
    const m = Math.floor((rem % 3600) / 60)
    return (
      <div className="countdown">
        <div className="cd-unit"><span className="cd-num">{String(days).padStart(2, '0')}</span><span className="cd-label">ngày</span></div>
        <div className="cd-sep">:</div>
        <div className="cd-unit"><span className="cd-num">{String(h).padStart(2, '0')}</span><span className="cd-label">giờ</span></div>
        <div className="cd-sep">:</div>
        <div className="cd-unit"><span className="cd-num">{String(m).padStart(2, '0')}</span><span className="cd-label">phút</span></div>
      </div>
    )
  }

  const h = String(Math.floor(rem / 3600)).padStart(2, '0')
  const m = String(Math.floor((rem % 3600) / 60)).padStart(2, '0')
  const s = String(rem % 60).padStart(2, '0')

  return (
    <div className="countdown">
      <div className="cd-unit"><span className={`cd-num${urgent ? ' urgent' : ''}`}>{h}</span><span className="cd-label">giờ</span></div>
      <div className="cd-sep">:</div>
      <div className="cd-unit"><span className={`cd-num${urgent ? ' urgent' : ''}`}>{m}</span><span className="cd-label">phút</span></div>
      <div className="cd-sep">:</div>
      <div className="cd-unit"><span className={`cd-num${urgent ? ' urgent' : ''}`}>{s}</span><span className="cd-label">giây</span></div>
    </div>
  )
}

type MixedItem =
  | { kind: 'auction'; data: AuctionItem; idx: number }
  | { kind: 'product'; data: ProductItem; idx: number }

function AdminEditBtn({ href }: { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[10px] font-bold text-gray-900 shadow hover:bg-amber-300 transition-colors"
    >
      ✏️ Sửa
    </a>
  )
}

function MixedSlider({
  auctions,
  products,
  router,
  isAdmin = false,
}: {
  auctions: AuctionItem[]
  products: ProductItem[]
  router: ReturnType<typeof useRouter>
  isAdmin?: boolean
}) {
  const PER_PAGE = 4
  const [quickOrder, setQuickOrder] = useState<{ id: string; slug: string; name: string; image: string | null; priceVnd: number | null } | null>(null)

  // auctions trước (trái) → products sau (phải)
  const items: MixedItem[] = [
    ...auctions.map((a, idx): MixedItem => ({ kind: 'auction', data: a, idx })),
    ...products.map((p, idx): MixedItem => ({ kind: 'product', data: p, idx })),
  ]

  const totalPages = Math.ceil(items.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const clipRef = useRef<HTMLDivElement>(null)

  const go = (next: number) => {
    next = Math.max(0, Math.min(totalPages - 1, next))
    setPage(next)
    if (clipRef.current) {
      clipRef.current.scrollTo({ left: next * clipRef.current.offsetWidth, behavior: 'smooth' })
    }
  }

  return (
    <>
    <div className="auction-slider-wrap">
      <div className="auction-slider-clip" ref={clipRef}>
        {items.map((item) => {
          if (item.kind === 'auction') {
            const auction = item.data
            const secsLeft = Math.max(0, Math.floor((new Date(auction.endsAt).getTime() - Date.now()) / 1000))
            const expired = secsLeft === 0
            const endingSoon = !expired && secsLeft < 3600
            return (
              <div
                key={`a-${auction.id}`}
                className="auction-card auction-slider-card"
                onClick={() => router.push(`/dau-gia/${auction.id}`)}
              >
                {expired
                  ? <div className="auction-badge-end" style={{background:'#6b7280'}}>Đã Kết Thúc</div>
                  : endingSoon
                    ? <div className="auction-badge-end">Sắp Kết Thúc</div>
                    : <div className="auction-badge-live"><span className="live-dot"></span> LIVE</div>
                }
                <div className="auction-img">
                  {auction.product.images[0]
                    ? <Image src={auction.product.images[0].url} alt={auction.product.name} fill sizes="(max-width:768px) 50vw, 250px" style={{objectFit:'cover'}} />
                    : <div className="auction-img-placeholder" style={{background: CAT_GRADIENTS[item.idx % CAT_GRADIENTS.length]}}><span className="product-emoji">{getCatEmoji(auction.product.name)}</span></div>
                  }
                </div>
                <div className="auction-body">
                  {auction.product.brand && <div className="auction-brand">{auction.product.brand.name}</div>}
                  <h3 className="auction-title" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{auction.product.name}</h3>
                  <div className="auction-meta">
                    <div className="auction-price-block">
                      <span className="current-bid-label">Giá Hiện Tại</span>
                      <div className="current-bid">{auction.currentPrice.toLocaleString('vi-VN')}₫</div>
                      <div className="bid-count">{auction.bidCount} lượt đặt giá</div>
                    </div>
                    <div className="countdown-block">
                      <span className="countdown-label">Kết Thúc Sau</span>
                      <AuctionCountdown endsAt={auction.endsAt} />
                    </div>
                  </div>
                  <button
                    className={`btn-bid${endingSoon ? ' urgent-bid' : ''}`}
                    style={{marginTop:'auto', width:'fit-content', margin:'auto auto 0'}}
                    onClick={(e) => { e.stopPropagation(); router.push(`/dau-gia/${auction.id}`) }}
                  >
                    Đặt Giá Ngay
                  </button>
                </div>
              </div>
            )
          }

          // product card
          const p = item.data
          const displayPrice = p.salePrice ?? p.originPrice ?? p.marketPrice
          return (
            <div
              key={`p-${p.id}`}
              className="auction-card auction-slider-card"
              onClick={() => router.push(`/${p.slug}`)}
            >
              {p.badge === 'ORDER_ONLY' && <div className="auction-badge-live" style={{fontSize:'0.55rem', padding:'2px 6px'}}>PRE ORDER</div>}
              {p.badge === 'NEW_ARRIVAL' && <div className="auction-badge-live" style={{fontSize:'0.55rem', fontWeight:700, padding:'2px 6px', background:'rgba(220,38,38,0.9)', letterSpacing:'0.08em'}}>MỚI VỀ</div>}
              {p.badge === 'SOLD_OUT' && <div className="auction-badge-live" style={{fontSize:'0.55rem', padding:'2px 6px', background:'#6b7280'}}>ĐÃ BÁN</div>}
              <div className="auction-img">
                {p.images[0]
                  ? <Image src={p.images[0].url} alt={p.name} fill sizes="(max-width:768px) 50vw, 250px" style={{objectFit:'contain',padding:'10px'}} />
                  : <div className="auction-img-placeholder" style={{background: CAT_GRADIENTS[item.idx % CAT_GRADIENTS.length]}}><span className="product-emoji">{getCatEmoji(p.category?.name ?? p.name)}</span></div>
                }
              </div>
              <div className="auction-body">
                {p.brand && <div className="auction-brand">{p.brand.name}</div>}
                <h3 className="auction-title" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</h3>
                <div className="auction-meta">
                  <div className="auction-price-block">
                    <span className="current-bid-label">Giá Bán</span>
                    {displayPrice
                      ? <div className="current-bid">{displayPrice.toLocaleString('vi-VN')}₫</div>
                      : <div className="current-bid" style={{color:'#6b7280',fontSize:'0.9rem'}}>Liên hệ báo giá</div>
                    }
                    {p.marketPrice && displayPrice && displayPrice < p.marketPrice && (
                      <div className="bid-count" style={{textDecoration:'line-through'}}>{p.marketPrice.toLocaleString('vi-VN')}₫</div>
                    )}
                  </div>
                  <div className="countdown-block">
                    <span className="countdown-label">Giao Hàng</span>
                    <div style={{fontSize:'0.78rem',fontWeight:600,color:'#6b7280',lineHeight:1.3}}>
                      🚚 7–10 ngày
                    </div>
                  </div>
                </div>
                <button
                  className="btn-bid"
                  style={{marginTop:'auto', background:'#e85d7a', width:'fit-content', margin:'auto auto 0'}}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--gradient-red)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#e85d7a')}
                  onClick={(e) => { e.stopPropagation(); setQuickOrder({ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, priceVnd: p.salePrice ?? p.originPrice ?? p.marketPrice ?? null }) }}
                >
                  Đặt Hàng Ngay
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <>
          <button
            onClick={() => go(page - 1)}
            disabled={page === 0}
            aria-label="Trang trước"
            style={{
              position: 'absolute', top: '42%', left: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === 0 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => go(page + 1)}
            disabled={page === totalPages - 1}
            aria-label="Trang sau"
            style={{
              position: 'absolute', top: '42%', right: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === totalPages - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === totalPages - 1 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Trang ${i + 1}`}
                style={{
                  width: i === page ? 22 : 8, height: 8, borderRadius: 4, border: 'none', padding: 0,
                  background: i === page ? '#dc2626' : '#d1d5db', cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>

    {quickOrder && (
      <QuickOrderModal
        open={true}
        onClose={() => setQuickOrder(null)}
        product={quickOrder}
      />
    )}
    </>
  )
}

function AuctionSlider({ auctions, router }: { auctions: AuctionItem[]; router: ReturnType<typeof useRouter> }) {
  const PER_PAGE = 4
  const totalPages = Math.ceil(auctions.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const clipRef = useRef<HTMLDivElement>(null)

  const go = (next: number) => {
    next = Math.max(0, Math.min(totalPages - 1, next))
    setPage(next)
    if (clipRef.current) {
      clipRef.current.scrollTo({ left: next * clipRef.current.offsetWidth, behavior: 'smooth' })
    }
  }

  return (
    <div className="auction-slider-wrap">
      <div className="auction-slider-clip" ref={clipRef}>
        {auctions.map((auction, i) => {
          const secsLeft = Math.max(0, Math.floor((new Date(auction.endsAt).getTime() - Date.now()) / 1000))
          const expired = secsLeft === 0
          const endingSoon = !expired && secsLeft < 3600
          return (
            <div
              key={auction.id}
              className="auction-card auction-slider-card"
              onClick={() => router.push(`/dau-gia/${auction.id}`)}
            >
              {expired
                ? <div className="auction-badge-end" style={{background:'#6b7280'}}>Đã Kết Thúc</div>
                : endingSoon
                  ? <div className="auction-badge-end">Sắp Kết Thúc</div>
                  : <div className="auction-badge-live"><span className="live-dot"></span> LIVE</div>
              }
              <div className="auction-img">
                {auction.product.images[0]
                  ? <Image src={auction.product.images[0].url} alt={auction.product.name} fill sizes="(max-width:768px) 50vw, 250px" style={{objectFit:'cover'}} />
                  : <div className="auction-img-placeholder" style={{background: CAT_GRADIENTS[i % CAT_GRADIENTS.length]}}><span className="product-emoji">{getCatEmoji(auction.product.name)}</span></div>
                }
              </div>
              <div className="auction-body">
                {auction.product.brand && <div className="auction-brand">{auction.product.brand.name}</div>}
                <h3 className="auction-title" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{auction.product.name}</h3>
                <div className="auction-meta">
                  <div className="auction-price-block">
                    <span className="current-bid-label">Giá Hiện Tại</span>
                    <div className="current-bid">{auction.currentPrice.toLocaleString('vi-VN')}₫</div>
                    <div className="bid-count">{auction.bidCount} lượt đặt giá</div>
                  </div>
                  <div className="countdown-block">
                    <span className="countdown-label">Kết Thúc Sau</span>
                    <AuctionCountdown endsAt={auction.endsAt} />
                  </div>
                </div>
                <button
                  className={`btn-bid${endingSoon ? ' urgent-bid' : ''}`}
                  onClick={(e) => { e.stopPropagation(); router.push(`/dau-gia/${auction.id}`) }}
                >
                  Đặt Giá Ngay
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Arrows + dots — chỉ hiện khi > 4 sản phẩm */}
      {totalPages > 1 && (
        <>
          <button
            onClick={() => go(page - 1)}
            disabled={page === 0}
            aria-label="Trang trước"
            style={{
              position: 'absolute', top: '42%', left: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === 0 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => go(page + 1)}
            disabled={page === totalPages - 1}
            aria-label="Trang sau"
            style={{
              position: 'absolute', top: '42%', right: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === totalPages - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === totalPages - 1 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Trang ${i + 1}`}
                style={{
                  width: i === page ? 22 : 8, height: 8, borderRadius: 4, border: 'none', padding: 0,
                  background: i === page ? '#dc2626' : '#d1d5db', cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NewArrivalsSlider({ items, router }: { items: ProductItem[]; router: ReturnType<typeof useRouter> }) {
  const PER_PAGE = 4
  const totalPages = Math.ceil(items.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const clipRef = useRef<HTMLDivElement>(null)

  const go = (next: number) => {
    next = Math.max(0, Math.min(totalPages - 1, next))
    setPage(next)
    if (clipRef.current) {
      clipRef.current.scrollTo({ left: next * clipRef.current.offsetWidth, behavior: 'smooth' })
    }
  }

  return (
    <div className="auction-slider-wrap">
      <div className="auction-slider-clip" ref={clipRef}>
        {items.map((p, i) => {
          const price = p.salePrice ?? p.originPrice
          const old = p.marketPrice ?? (p.salePrice && p.originPrice && p.originPrice > p.salePrice ? p.originPrice : null)
          return (
            <div key={p.id} className="product-card auction-slider-card" onClick={() => router.push(`/${p.slug}`)}>
              <div className="product-img">
                {p.images[0]
                  ? <Image src={p.images[0].url} alt={p.name} fill sizes="(max-width:768px) 50vw, 250px" style={{objectFit:'contain',padding:'12px'}} />
                  : <div className="product-img-placeholder" style={{background: CAT_GRADIENTS[i % CAT_GRADIENTS.length]}}><span style={{fontSize:'3rem'}}>{getCatEmoji(p.category?.name ?? p.name)}</span></div>
                }
                <div style={{position:'absolute',top:12,left:12,background:'rgba(220,38,38,0.9)',color:'#fff',fontSize:'0.55rem',fontWeight:700,padding:'2px 6px',borderRadius:9999,letterSpacing:'0.08em',zIndex:2}}>MỚI VỀ</div>
                <div className="product-wishlist">♡</div>
              </div>
              <div className="product-body">
                {p.brand && <div className="product-brand">{p.brand.name}</div>}
                <h3>{p.name}</h3>
                <div className="product-origin">🇯🇵 Hàng Nhật Chính Hãng</div>
                <div className="product-price">
                  {price
                    ? <>
                        <span className="price-main">{price.toLocaleString('vi-VN')}₫</span>
                        {old && old > price && <span className="price-old" style={{textDecoration:'line-through',color:'#999',fontSize:'0.85em',marginLeft:6}}>{old.toLocaleString('vi-VN')}₫</span>}
                      </>
                    : <span className="price-main">Liên hệ</span>}
                </div>
                <button className="btn-buy" onClick={(e) => { e.stopPropagation(); router.push(`/${p.slug}`) }}>Xem chi tiết</button>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <>
          <button
            onClick={() => go(page - 1)}
            disabled={page === 0}
            aria-label="Trang trước"
            style={{
              position: 'absolute', top: '42%', left: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === 0 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => go(page + 1)}
            disabled={page === totalPages - 1}
            aria-label="Trang sau"
            style={{
              position: 'absolute', top: '42%', right: -18, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === totalPages - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)', opacity: page === totalPages - 1 ? 0.35 : 1, zIndex: 2,
              transition: 'opacity 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Trang ${i + 1}`}
                style={{
                  width: i === page ? 22 : 8, height: 8, borderRadius: 4, border: 'none', padding: 0,
                  background: i === page ? '#dc2626' : '#d1d5db', cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

type HeroBanner = { id: string; title: string; imageUrl: string; linkUrl: string | null }

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url)
}

function HeroBannerSlider({ banners, router }: { banners: HeroBanner[]; router: ReturnType<typeof useRouter> }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = (i: number) => setIdx((i + banners.length) % banners.length)

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx((p) => (p + 1) % banners.length), 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [banners.length])

  const activeBanner = banners[idx]!

  return (
    <section
      className="relative overflow-hidden h-[300px] sm:h-[440px] lg:h-[625px]"
      style={{ cursor: activeBanner.linkUrl ? 'pointer' : 'default' }}
      onClick={() => { if (activeBanner.linkUrl) router.push(activeBanner.linkUrl) }}
    >
      {/* Render tất cả banner chồng nhau — crossfade bằng opacity */}
      {banners.map((banner, i) => {
        const active = i === idx
        const video = isVideo(banner.imageUrl)
        return (
          <div
            key={banner.imageUrl}
            style={{
              position: 'absolute', inset: 0,
              opacity: active ? 1 : 0,
              transition: 'opacity 0.8s ease-in-out',
              zIndex: active ? 1 : 0,
            }}
          >
            {video ? (
              <>
                <Image
                  src={banner.imageUrl.replace(/\.mp4$/i, '.jpg')}
                  alt={banner.title}
                  fill sizes="100vw"
                  priority={i === 0}
                  className="lg:hidden"
                  style={{ objectFit: 'cover' }}
                />
                <video
                  src={banner.imageUrl}
                  poster={banner.imageUrl.replace(/\.mp4$/i, '.jpg')}
                  autoPlay muted loop playsInline preload="none"
                  className="hidden lg:block"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </>
            ) : (
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill sizes="100vw"
                priority={i === 0}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>
        )
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)', zIndex: 2 }} />
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(idx - 1) }}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 9999, width: 40, height: 40, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); go(idx + 1) }}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 9999, width: 40, height: 40, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}
          >›</button>
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); go(i) }}
                style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, border: 'none', background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

type TestimonialItem = { id: string; name: string; city: string; photoUrl: string | null; text: string; rating: number }

const TESTIMONIAL_FALLBACK: TestimonialItem[] = [
  { id: '1', name: 'Nguyễn Thị Lan',  city: 'TP. Hồ Chí Minh', photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg', text: 'Mua nồi cơm Tiger từ JapanVip, hàng về đúng như mô tả, đóng gói cực kỹ. Giá rẻ hơn mua tại shop 30%.', rating: 5 },
  { id: '2', name: 'Trần Văn Khoa',   city: 'Hà Nội',           photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',   text: 'Đấu giá được máy lọc không khí Daikin với giá cực tốt. Quy trình đấu giá rõ ràng, cập nhật real-time rất tiện.', rating: 5 },
  { id: '3', name: 'Phạm Minh Hoàng', city: 'Đà Nẵng',          photoUrl: 'https://randomuser.me/api/portraits/men/67.jpg',   text: 'Dán link Amazon Nhật, trong 1 phút đã có báo giá đầy đủ. Cực kỳ tiện lợi và minh bạch.', rating: 5 },
]

function TestimonialSlider({ data }: { data: TestimonialItem[] }) {
  const items = data.length > 0 ? data : TESTIMONIAL_FALLBACK
  const [page, setPage] = useState(0)
  const perPage = 3
  const total = Math.ceil(items.length / perPage)

  useEffect(() => {
    const t = setInterval(() => setPage(p => (p + 1) % total), 12000)
    return () => clearInterval(t)
  }, [total])

  const visible = Array.from({ length: perPage }, (_, i) => items[(page * perPage + i) % items.length]!)

  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header centered">
          <span className="section-label" style={{ fontSize: '1rem' }}>Khách Hàng Nói Gì</span>
          <h2 style={{ fontSize: '1.5rem' }}>Đánh Giá Từ Cộng Đồng</h2>
        </div>

        <div className="testimonials-grid" style={{ minHeight: 220 }}>
          {visible.map((t, i) => (
            <div key={page + '-' + i} className={`testimonial-card${i === 1 ? ' featured-test' : ''}`}
              style={{ animation: 'fadeInUp 0.4s ease both', animationDelay: `${i * 0.08}s` }}>
              <div className="test-stars">{'★'.repeat(t.rating ?? 5)}</div>
              <p>&ldquo;{t.text}&rdquo;</p>
              <div className="test-author">
                <img src={t.photoUrl ?? ''} alt={t.name} className="test-avatar-img" loading="lazy" width={48} height={48}
                  onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex' }} />
                <div className="test-avatar" style={{ display: 'none' }}>{t.name.split(' ').map(w => w[0]).slice(-2).join('')}</div>
                <div><strong>{t.name}</strong><span>{t.city}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0, background: i === page ? '#c0392b' : '#e0e0e0' }} />
          ))}
        </div>
      </div>
    </section>
  )
}

const DEFAULTS: Record<string, string> = {
  home_hero_title: 'Gia Dụng Nhật Bản',
  home_hero_accent: 'Đẳng Cấp Vượt Trội',
  home_hero_desc: 'Mua hàng trực tiếp từ Amazon Japan, Rakuten, Mercari với dịch vụ trọn gói – Uy tín – Minh bạch – Nhanh chóng',
  home_bfj_title: 'Dán Link – Nhận Báo Giá Trong 30 Giây',
  home_bfj_desc: 'Chỉ cần copy đường dẫn sản phẩm từ các sàn Nhật Bản, chúng tôi sẽ tự động hiển thị giá, phí vận chuyển và tổng chi phí về Việt Nam.',
  home_products_title: 'Sản Phẩm Bán Chạy',
  home_auctions_title: 'Phiên Đấu Giá Đang Diễn Ra',
  home_why_title: 'Trải Nghiệm Mua Sắm Nhật Bản Đỉnh Cao',
  home_why_desc: 'Chúng tôi kết hợp công nghệ hiện đại với dịch vụ tận tâm để mang đến trải nghiệm mua hàng Nhật Bản tốt nhất cho người Việt.',
  home_why_feat1_title: 'Thanh Toán An Toàn',
  home_why_feat1_desc: 'Thanh toán đặt cọc qua ngân hàng bảo mật, hoàn tiền nếu không giao được hàng.',
  home_why_feat2_title: 'Ảnh Thực Tế 100%',
  home_why_feat2_desc: 'Chụp ảnh thực tế sản phẩm trước khi giao, không dùng ảnh quảng cáo.',
  home_why_feat3_title: 'Đội Ngũ Tại Nhật',
  home_why_feat3_desc: 'Nhân viên túc trực tại Nhật Bản, hỗ trợ mua hàng theo yêu cầu đặc biệt.',
  home_cta_title: 'Sẵn Sàng Trải Nghiệm Gia Dụng Nhật Bản?',
  home_cta_desc: 'Đăng ký ngay hôm nay để nhận ưu đãi phí dịch vụ 0% cho đơn hàng đầu tiên',
  home_cta_btn1: 'Mua Hàng Nhật Ngay',
  home_cta_btn2: 'Tham Gia Đấu Giá',
  home_stat1_num: '5', home_stat1_suffix: '+', home_stat1_label: 'Năm Kinh Nghiệm',
  home_stat2_num: '15', home_stat2_suffix: 'K+', home_stat2_label: 'Đơn Hàng Thành Công',
  home_stat3_num: '98', home_stat3_suffix: '%', home_stat3_label: 'Khách Hài Lòng',
  home_stat4_num: '500', home_stat4_suffix: '+', home_stat4_label: 'Thương Hiệu Nhật',
}

type BrandItem = { id: string; name: string; slug: string; logoUrl: string }

export default function HomePageClient({
  categories,
  products,
  orderProducts = [],
  newArrivals = [],
  auctions,
  content = {},
  heroBanners = [],
  brands = [],
  testimonials = [],
}: {
  categories: CategoryItem[]
  products: ProductItem[]
  orderProducts?: ProductItem[]
  newArrivals?: ProductItem[]
  auctions: AuctionItem[]
  content?: Record<string, string>
  heroBanners?: HeroBanner[]
  brands?: BrandItem[]
  testimonials?: TestimonialItem[]
}) {
  const router = useRouter()
  // isAdmin lấy client-side để trang chủ render TĨNH (CDN) — admin thấy nút sửa sau khi hydrate
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const nav = (page: string) => (window as any).navigate?.(page)
  const t = (key: string) => content[key] || DEFAULTS[key] || ''

  return (
    <>
      <div id="app">

        {/* ████ HOME ████ */}
        <div className="page active" id="page-home">
          {heroBanners.length > 0 && <HeroBannerSlider banners={heroBanners} router={router} />}
          <section className="hero" style={heroBanners.length > 0 ? { display: 'none' } : undefined}>
            <div className="hero-slides">
              <div className="hero-slide active" id="slide-1">
                <div className="hero-bg" style={{background:'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'}}>
                  <div className="hero-pattern"></div>
                </div>
                <div className="container">
                  <div className="hero-content">
                    <div className="hero-badge">✦ Nhật Bản Chính Hãng</div>
                    <h1 className="hero-title">{t('home_hero_title')}<br /><span className="hero-accent" style={{display:'block', marginTop:'0.35em', marginLeft:'1.1em', fontSize:'0.85em', whiteSpace:'nowrap'}}>{t('home_hero_accent')}</span></h1>
                    <p className="hero-desc">{t('home_hero_desc')}</p>
                    <div className="hero-actions">
                      <button className="btn-primary" onClick={() => router.push('/mua-ho')}>Mua Hàng Nhật Ngay</button>
                      <button className="btn-outline-white" onClick={() => router.push('/dau-gia')}>Xem Đấu Giá Hôm Nay</button>
                    </div>
                    <div className="hero-stats">
                      <div className="stat"><strong>15,000+</strong><span>Đơn Thành Công</span></div>
                      <div className="stat-sep"></div>
                      <div className="stat"><strong>98.5%</strong><span>Hài Lòng</span></div>
                      <div className="stat-sep"></div>
                      <div className="stat"><strong>500+</strong><span>Thương Hiệu Nhật</span></div>
                    </div>
                  </div>
                  <div className="hero-visual">
                    <div className="hero-card-float card-1">
                      <div className="float-icon">🏠</div>
                      <div><div className="float-title">Tổ Ấm</div><div className="float-price">Viên Mãn</div></div>
                    </div>
                    <div className="hero-card-float card-2">
                      <div className="float-icon">💝</div>
                      <div><div className="float-title">Hạnh Phúc</div><div className="float-price">Trọn Vẹn</div></div>
                    </div>
                    <div className="hero-circle">
                      <div className="hero-circle-inner"><span>日本</span><span>品質</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-indicators">
              <span className="indicator active"></span><span className="indicator"></span><span className="indicator"></span>
            </div>
          </section>

          <section className="trust-bar">
            <div className="container">
              <div className="trust-items">
                {[
                  {icon:'🛡️', title:'100% Chính Hãng', sub:'Cam kết nguồn gốc rõ ràng'},
                  {icon:'🚀', title:'Giao Hàng Nhanh', sub:'7–14 ngày từ Nhật về VN'},
                  {icon:'💰', title:'Giá Minh Bạch', sub:'Không phí ẩn, rõ ràng 100%'},
                  {icon:'🔄', title:'Đổi Trả Dễ Dàng', sub:'Bảo hành & hỗ trợ 24/7'},
                  {icon:'📞', title:'Hỗ Trợ Tận Tâm', sub:'CSKH chuyên nghiệp'},
                ].map(t => (
                  <div key={t.title} className="trust-item">
                    <div className="trust-icon">{t.icon}</div>
                    <div><strong>{t.title}</strong><span>{t.sub}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="url-tool-section">
            <div className="container">
              <div className="url-tool-wrapper">
                <div className="url-tool-left">
                  <span className="section-label">Dịch Vụ Mua Hộ</span>
                  <h2>{t('home_bfj_title')}</h2>
                  <p>{t('home_bfj_desc')}</p>
                  <div className="supported-sites">
                    <span className="site-badge amazon">Amazon JP</span>
                    <span className="site-badge rakuten">Rakuten</span>
                    <span className="site-badge mercari">Mercari</span>
                    <span className="site-badge yahoo">Yahoo JP</span>
                  </div>
                </div>
                <div className="url-tool-right">
                  <div className="url-import-box">
                    <div className="url-import-label">📎 Dán link sản phẩm Nhật Bản</div>
                    <div className="url-input-group">
                      <div style={{position:'relative',flex:1}}>
                        <input type="url" id="hero-url-input" placeholder="https://www.amazon.co.jp/..."
                          style={{paddingRight:'36px',width:'100%',boxSizing:'border-box'}}
                          onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) router.push(`/mua-ho?url=${encodeURIComponent(v)}`)} }} />
                        <button
                          title="Dán từ clipboard"
                          style={{position:'absolute',top:'6px',right:'6px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',padding:'2px',lineHeight:1,opacity:0.5}}
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText()
                              const input = document.getElementById('hero-url-input') as HTMLInputElement
                              if (input && text.trim()) input.value = text.trim()
                            } catch {}
                          }}
                        >📋</button>
                      </div>
                      <button className="btn-primary" onClick={() => { const v = (document.getElementById('hero-url-input') as HTMLInputElement)?.value.trim(); router.push(v ? `/mua-ho?url=${encodeURIComponent(v)}` : '/mua-ho') }}>Kiểm Tra Ngay</button>
                    </div>
                    <div className="url-examples">
                      <span>Ví dụ:</span>
                      <button onClick={() => router.push('/mua-ho')}>amazon.co.jp/...</button>
                      <button onClick={() => router.push('/mua-ho')}>item.rakuten.co.jp/...</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ CATEGORIES — dynamic from DB ═══ */}
          <section className="categories-section">
            <div className="container">
              <div className="section-header">
                <span className="section-label">Danh Mục</span>
                <h2 style={{fontSize:'clamp(1.05rem, 4.4vw, 1.4rem)'}}>Gia Dụng Nhật Bản Được Yêu Thích Nhất</h2>
              </div>
              <div className="categories-grid">
                {categories.map((cat, i) => (
                  <div
                    key={cat.id}
                    className={`cat-card${i === 0 ? ' cat-large' : ''}`}
                    onClick={() => router.push(`/danh-muc/${cat.slug}`)}
                  >
                    <div className="cat-bg" style={{background: CAT_GRADIENTS[i % CAT_GRADIENTS.length]}}></div>
                    <div className="cat-icon">
                      {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/'))
                        ? (cat.icon.includes('media.japanvip.vn') || cat.icon.includes('r2.dev') || cat.icon.startsWith('/'))
                          ? <Image src={cat.icon} alt={cat.name} width={256} height={256} sizes="(max-width:768px) 80px, 200px" />
                          : <img src={cat.icon} alt={cat.name} loading="lazy" />
                        : (cat.icon || getCatEmoji(cat.name))}
                    </div>
                    <div className="cat-info">
                      <h3 style={{textTransform:'uppercase'}}>{cat.name}</h3>
                      {cat.description && <span>{cat.description}</span>}
                      <div className="cat-count">{cat._count.products + (cat.children?.reduce((s, c) => s + c._count.products, 0) ?? 0)} sản phẩm</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="live-auction-section">
            <div className="container">
              <div className="section-header">
                <div>
                  <span className="section-label">Nổi Bật</span>
                  <h2 style={{fontSize:'clamp(1.05rem, 4.4vw, 1.4rem)'}}>Sản Phẩm &amp; Đấu Giá Nổi Bật</h2>
                </div>
                <button onClick={() => router.push('/san-pham')} className="see-all-link">Xem Tất Cả <span>→</span></button>
              </div>
              {auctions.length === 0 && products.length === 0 ? (
                <div className="empty-state">
                  <p>📦 Chưa có sản phẩm hay phiên đấu giá nào.</p>
                </div>
              ) : (
                <MixedSlider auctions={auctions} products={orderProducts} router={router} isAdmin={isAdmin} />
              )}
            </div>
          </section>

          {newArrivals.length > 0 && (
            <section className="featured-section">
              <div className="container">
                <div className="section-header">
                  <div><span className="section-label">Mới Về</span><h2 style={{fontSize:'1.5rem'}}>Hàng Mới Về</h2></div>
                  <button onClick={() => router.push('/san-pham')} className="see-all-link">Xem Tất Cả <span>→</span></button>
                </div>
                <NewArrivalsSlider items={newArrivals} router={router} />
              </div>
            </section>
          )}

          <section className="featured-section">
            <div className="container">
              <div className="section-header">
                <div><span className="section-label">Nổi Bật</span><h2 style={{fontSize:'1.5rem'}}>{t('home_products_title')}</h2></div>
                <button onClick={() => router.push('/san-pham')} className="see-all-link">Xem Tất Cả <span>→</span></button>
              </div>
              {products.length === 0 ? (
                <div className="empty-state">
                  <p>📦 Chưa có sản phẩm nào. Admin hãy thêm sản phẩm tại <a href="/admin/products/new">/admin/products</a>.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((p, i) => (
                    <div key={p.id} className="product-card" onClick={() => router.push(`/${p.slug}`)}>
                      <div className="product-img">
                        {p.images[0]
                          ? <Image src={p.images[0].url} alt={p.name} fill sizes="(max-width:768px) 50vw, 250px" style={{objectFit:'contain',padding:'12px'}} />
                          : <div className="product-img-placeholder" style={{background: CAT_GRADIENTS[i % CAT_GRADIENTS.length]}}><span style={{fontSize:'3rem'}}>{getCatEmoji(p.category?.name ?? p.name)}</span></div>
                        }

                        <div className="product-wishlist">♡</div>
                      </div>
                      <div className="product-body">
                        {p.brand && <div className="product-brand">{p.brand.name}</div>}
                        <h3>{p.name}</h3>
                        <div className="product-origin">🇯🇵 Hàng Nhật Chính Hãng</div>
                        <div className="product-price">
                          {(() => {
                            const price = p.salePrice ?? p.originPrice
                            const old = p.marketPrice ?? (p.salePrice && p.originPrice && p.originPrice > p.salePrice ? p.originPrice : null)
                            if (!price) return <span className="price-main">Liên hệ</span>
                            return <>
                              <span className="price-main">{price.toLocaleString('vi-VN')}₫</span>
                              {old && old > price && <span className="price-old" style={{textDecoration:'line-through',color:'#999',fontSize:'0.85em',marginLeft:6}}>{old.toLocaleString('vi-VN')}₫</span>}
                            </>
                          })()}
                        </div>
                        <button className="btn-buy" onClick={(e) => { e.stopPropagation(); router.push(`/${p.slug}`) }}>Xem chi tiết</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="why-section">
            <div className="container">
              <div className="why-inner">
                <div className="why-left">
                  <span className="section-label">Tại Sao Chọn JapanVip</span>
                  <h2 style={{fontSize:'1.5rem'}}>{t('home_why_title')}</h2>
                  <p>{t('home_why_desc')}</p>
                  <div className="why-features">
                    {[
                      {icon:'🔐',title:t('home_why_feat1_title'),desc:t('home_why_feat1_desc')},
                      {icon:'📸',title:t('home_why_feat2_title'),desc:t('home_why_feat2_desc')},
                      {icon:'🌐',title:t('home_why_feat3_title'),desc:t('home_why_feat3_desc')},
                    ].map(f => (
                      <div key={f.title} className="why-feat">
                        <div className="why-feat-icon">{f.icon}</div>
                        <div><strong>{f.title}</strong><p>{f.desc}</p></div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-outline-red" onClick={() => router.push('/lien-he')}>Tìm Hiểu Thêm</button>
                </div>
                <div className="why-right">
                  <div className="why-stats-grid">
                    {([1,2,3,4] as const).map((n, i) => {
                      const end = parseFloat(t(`home_stat${n}_num`)) || 0
                      const suffix = t(`home_stat${n}_suffix`)
                      const label = t(`home_stat${n}_label`)
                      return (
                        <div key={n} className={`why-stat${i % 2 === 1 ? ' highlight' : ''}`}>
                          <div className="why-stat-num"><CountUp end={end} suffix={suffix} /></div>
                          <div className="why-stat-label">{label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <TestimonialSlider data={testimonials} />

          {brands.filter(b => b.logoUrl).length > 0 && (
            <section className="py-5 bg-white border-y border-gray-100 overflow-hidden">
              <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-600 mb-4">
                Thương Hiệu Đối Tác
              </p>
              <div className="relative">
                <div className="flex gap-6 items-center animate-marquee whitespace-nowrap">
                  {[...brands.filter(b => b.logoUrl), ...brands.filter(b => b.logoUrl)].map((b, i) => (
                    <a
                      key={b.id + '-' + i}
                      href={`/san-pham?brandId=${b.id}`}
                      title={b.name}
                      className="inline-flex shrink-0 hover:scale-110 transition-transform duration-200"
                    >
                      <Image
                        src={b.logoUrl}
                        alt={b.name}
                        width={140}
                        height={56}
                        className="h-10 w-auto object-contain"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="cta-section">
            <div className="container">
              <div className="cta-inner">
                <div className="cta-text">
                  <h2>{t('home_cta_title')}</h2>
                  <p>{t('home_cta_desc')}</p>
                </div>
                <div className="cta-actions">
                  <button className="btn-primary large" onClick={() => router.push('/mua-ho')}>{t('home_cta_btn1')}</button>
                  <button className="btn-outline-white large" onClick={() => router.push('/dau-gia')}>{t('home_cta_btn2')}</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ████ CÁC TRANG KHÁC ████ */}
        <div className="page" id="page-mua-ho">
          <div className="page-hero simple">
            <div className="container">
              <div className="breadcrumb"><span onClick={() => nav('home')}>Trang Chủ</span> / <span>Mua Hàng Nhật</span></div>
              <h1>Dịch Vụ Mua Hàng Từ Nhật Bản</h1>
              <p>Dán link sản phẩm – Nhận báo giá tức thì – Giao về tận nhà</p>
            </div>
          </div>
          <section className="buy-section">
            <div className="container">
              <div className="buy-layout">
                <div className="buy-main">
                  <div className="url-import-tool">
                    <h2>🔗 Nhập URL Sản Phẩm</h2>
                    <p className="tool-desc">Dán đường dẫn sản phẩm từ các sàn Nhật Bản bên dưới.</p>
                    <div className="url-input-area">
                      <div className="url-input-wrap">
                        <svg className="url-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <input type="url" id="product-url-input" placeholder="https://www.amazon.co.jp/dp/..." />
                        <button className="btn-clear" id="clear-url" title="Xóa">✕</button>
                      </div>
                      <button className="btn-primary btn-check" id="btn-check-url" onClick={() => (window as any).showProductResult?.()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Kiểm Tra Ngay
                      </button>
                    </div>
                    <div className="url-tips"><strong>💡 Hỗ trợ:</strong><ul><li>amazon.co.jp/dp/...</li><li>item.rakuten.co.jp/...</li><li>jp.mercari.com/item/...</li></ul></div>
                  </div>
                  <div className="product-result" id="product-result" style={{display:'none'}}>
                    <h3>📦 Thông Tin Sản Phẩm</h3>
                    <div className="result-card">
                      <div className="result-img"><div className="result-img-placeholder" style={{background:'linear-gradient(135deg, #667eea, #764ba2)'}}><span style={{fontSize:'4rem'}}>🍚</span></div><div className="source-badge">Amazon JP</div></div>
                      <div className="result-info">
                        <h4>Tiger IH Rice Cooker JKT-S18W 1.8L</h4>
                        <div className="price-breakdown">
                          <div className="price-row"><span>Giá sản phẩm (JPY)</span><strong>¥18,980</strong></div>
                          <div className="price-row"><span>Quy đổi VND (≈ 170₫/¥)</span><strong>3,226,600₫</strong></div>
                          <div className="price-row"><span>Phí vận chuyển về VN (est.)</span><strong>450,000₫</strong></div>
                          <div className="price-row"><span>Phí dịch vụ JapanVip (5%)</span><strong>161,330₫</strong></div>
                          <div className="price-row total"><span>Tổng Chi Phí Ước Tính</span><strong>3,837,930₫</strong></div>
                        </div>
                        <div className="result-actions">
                          <button className="btn-primary" onClick={() => nav('order-tracking')}>Đặt Cọc & Mua Ngay</button>
                          <button className="btn-outline" onClick={() => (window as any).sendQuote?.()}>Yêu Cầu Báo Giá</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <aside className="buy-sidebar">
                  <div className="sidebar-widget">
                    <h4>💰 Bảng Phí Dịch Vụ</h4>
                    <table className="fee-table"><tbody>
                      <tr><td>Phí mua hộ</td><td className="fee-val">5%</td></tr>
                      <tr><td>Phí kho Nhật</td><td className="fee-val">0₫</td></tr>
                      <tr><td>Ship JP → VN</td><td className="fee-val">Theo kg</td></tr>
                      <tr className="highlight-row"><td>Đặt cọc tối thiểu</td><td className="fee-val">30%</td></tr>
                    </tbody></table>
                  </div>
                  <div className="sidebar-widget contact-widget">
                    <h4>💬 Cần Hỗ Trợ?</h4>
                    <p>Liên hệ tư vấn viên để được hỗ trợ báo giá nhanh nhất</p>
                    <a href="tel:0988969896" className="btn-primary w-full">📞 0988.969.896</a>
                    <a href="https://zalo.me/0988969896" className="btn-outline w-full mt-sm" target="_blank" rel="noopener noreferrer">💬 Chat Zalo</a>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>

        <div className="page" id="page-product-detail">
          <div className="container">
            <div className="breadcrumb mt-lg"><span onClick={() => nav('home')}>Trang Chủ</span> / <span onClick={() => router.push('/dau-gia')}>Gia Dụng</span> / <span>Nồi Cơm Tiger JKT-S18W</span></div>
            <div className="product-detail-layout">
              <div className="product-gallery">
                <div className="gallery-main" style={{background:'linear-gradient(135deg, #667eea, #764ba2)'}}><span style={{fontSize:'6rem'}}>🍚</span></div>
                <div className="gallery-thumbs">{['🍚','📐','⚙️','📦'].map((e,i) => <div key={i} className={`thumb${i===0?' active':''}`} style={{background:`linear-gradient(135deg,${i%2===0?'#667eea,#764ba2':'#764ba2,#667eea'})`}}><span>{e}</span></div>)}</div>
              </div>
              <div className="product-detail-info">
                <div className="detail-badges"><span className="badge-origin">🇯🇵 Nhật Bản Chính Hãng</span><span className="badge-hot">🔥 Bán Chạy</span></div>
                <div className="detail-brand">Tiger Corporation</div>
                <h1 className="detail-title">Nồi Cơm Điện Tiger JKT-S18W IH 1.8L – Tacook Simultaneous Cooking</h1>
                <div className="detail-price-block">
                  <div className="detail-price">3,200,000₫</div>
                  <div className="detail-price-old">3,800,000₫</div>
                  <div className="discount-badge">-16%</div>
                </div>
                <div className="detail-actions">
                  <button className="btn-primary large" onClick={() => nav('order-tracking')}>🛒 Mua Ngay</button>
                  <button className="btn-outline large">♡ Yêu Thích</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="page" id="page-auction">
          <div className="page-hero auction-hero">
            <div className="container">
              <div className="breadcrumb"><span onClick={() => nav('home')}>Trang Chủ</span> / <span>Đấu Giá</span></div>
              <h1>🔨 Sàn Đấu Giá Gia Dụng Nhật Bản</h1>
              <p>Tìm kiếm sản phẩm Nhật chính hãng với giá tốt nhất qua hình thức đấu giá minh bạch</p>
            </div>
          </div>
          <div className="container"><p style={{padding:'40px 0',textAlign:'center',color:'#9ca3af'}}>Đang tải danh sách đấu giá...</p></div>
        </div>

        <div className="page" id="page-auction-detail">
          <div className="container">
            <div className="breadcrumb mt-lg"><span onClick={() => nav('home')}>Trang Chủ</span> / <span onClick={() => router.push('/dau-gia')}>Đấu Giá</span> / <span>Nồi Cơm Tiger JKT-S18W</span></div>
            <div className="auction-detail-layout">
              <div className="auction-detail-left">
                <div className="auction-status-bar"><span className="status-live"><span className="live-dot"></span> Đang Diễn Ra</span><span className="auction-id">#AUC-2026-0892</span></div>
                <div className="auction-gallery"><div className="gallery-main" style={{background:'linear-gradient(135deg, #667eea, #764ba2)'}}><span style={{fontSize:'6rem'}}>🍚</span></div></div>
              </div>
              <div className="auction-detail-right">
                <div className="auction-detail-brand">Tiger Corporation</div>
                <h2 className="auction-detail-title">Nồi Cơm Điện Tiger JKT-S18W IH 1.8L</h2>
                <div className="big-countdown">
                  <div className="big-countdown-label">⏱️ Phiên đấu giá kết thúc sau</div>
                  <div className="big-cd">
                    <div className="big-cd-unit"><span className="big-cd-num" id="big-h">02</span><span className="big-cd-label">Giờ</span></div>
                    <div className="big-cd-sep">:</div>
                    <div className="big-cd-unit"><span className="big-cd-num" id="big-m">34</span><span className="big-cd-label">Phút</span></div>
                    <div className="big-cd-sep">:</div>
                    <div className="big-cd-unit"><span className="big-cd-num" id="big-s">18</span><span className="big-cd-label">Giây</span></div>
                  </div>
                </div>
                <div className="current-bid-block">
                  <div className="bid-row">
                    <div><div className="bid-label">Giá Đặt Hiện Tại</div><div className="bid-current">3,200,000₫</div></div>
                    <div><div className="bid-label">Bước Giá Tối Thiểu</div><div className="bid-step">+ 50,000₫</div></div>
                  </div>
                </div>
                <div className="bid-input-block">
                  <label>Số Tiền Đặt Giá Của Bạn</label>
                  <div className="bid-input-wrap"><input type="number" id="bid-amount" defaultValue={3250000} step={50000} /><span className="bid-currency">₫</span></div>
                  <div className="bid-suggestions">
                    <button className="bid-sug" onClick={() => (window as any).setBid?.(3250000)}>3,250,000₫</button>
                    <button className="bid-sug" onClick={() => (window as any).setBid?.(3300000)}>3,300,000₫</button>
                    <button className="bid-sug" onClick={() => (window as any).setBid?.(3500000)}>3,500,000₫</button>
                  </div>
                  <button className="btn-bid-big" onClick={() => (window as any).placeBid?.()}>🔨 Đặt Giá Ngay</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="page" id="page-order-tracking">
          <div className="page-hero simple">
            <div className="container">
              <div className="breadcrumb"><span onClick={() => nav('home')}>Trang Chủ</span> / <span>Theo Dõi Đơn Hàng</span></div>
              <h1>📦 Theo Dõi Đơn Hàng</h1>
              <p>Kiểm tra trạng thái đơn hàng của bạn theo thời gian thực</p>
            </div>
          </div>
          <section className="tracking-section">
            <div className="container">
              <div className="tracking-search-box">
                <h3>Nhập Mã Đơn Hàng</h3>
                <div className="tracking-input-wrap">
                  <input type="text" placeholder="Ví dụ: JVP-2026-001234" id="tracking-input" />
                  <button className="btn-primary" onClick={() => (window as any).showTracking?.()}>Theo Dõi Ngay</button>
                </div>
              </div>
              <div className="tracking-result" id="tracking-result" style={{display:'none'}}><p style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>Nhập mã đơn hàng để xem trạng thái</p></div>
            </div>
          </section>
        </div>

        <div className="page" id="page-dashboard">
          <div style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}>
            <p style={{fontSize:'3rem'}}>👤</p>
            <p>Vui lòng <a href="/login" style={{color:'#c41e3a',fontWeight:600}}>đăng nhập</a> để xem tài khoản</p>
          </div>
        </div>

        <div className="page" id="page-seller-dashboard">
          <div style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}>
            <p style={{fontSize:'3rem'}}>🏪</p>
            <p>Trang dành cho đối tác — vui lòng <a href="/login" style={{color:'#c41e3a',fontWeight:600}}>đăng nhập</a></p>
          </div>
        </div>

        <div className="page" id="page-blog">
          <div className="page-hero simple">
            <div className="container">
              <div className="breadcrumb"><span onClick={() => nav('home')}>Trang Chủ</span> / <span>Blog</span></div>
              <h1>📝 Blog Gia Dụng Nhật Bản</h1>
              <p>Kiến thức, đánh giá và kinh nghiệm mua hàng Nhật Bản từ chuyên gia</p>
            </div>
          </div>
          <div className="container" style={{padding:'40px 24px',textAlign:'center',color:'#9ca3af'}}>Đang cập nhật bài viết...</div>
        </div>

        <div className="page" id="page-contact">
          <div className="page-hero simple">
            <div className="container">
              <div className="breadcrumb"><span onClick={() => nav('home')}>Trang Chủ</span> / <span>Liên Hệ</span></div>
              <h1>📞 Liên Hệ JapanVip</h1>
              <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>
            </div>
          </div>
          <div className="container contact-container">
            <div className="contact-layout">
              <div className="contact-form-side">
                <h2>Gửi Tin Nhắn Cho Chúng Tôi</h2>
                <div className="contact-form">
                  <div className="form-row two-col">
                    <div className="form-group"><label>Họ và Tên <span className="req">*</span></label><input type="text" placeholder="Nguyễn Văn A" /></div>
                    <div className="form-group"><label>Số Điện Thoại <span className="req">*</span></label><input type="tel" placeholder="0901 234 567" /></div>
                  </div>
                  <div className="form-group"><label>Email <span className="req">*</span></label><input type="email" placeholder="email@gmail.com" /></div>
                  <div className="form-group"><label>Nội Dung <span className="req">*</span></label><textarea rows={5} placeholder="Mô tả chi tiết câu hỏi..."></textarea></div>
                  <button className="btn-primary large w-full" onClick={() => (window as any).submitContact?.()}>📤 Gửi Tin Nhắn</button>
                </div>
              </div>
              <div className="contact-info-side">
                <h2>Thông Tin Liên Hệ</h2>
                <div className="contact-cards">
                  <div className="contact-card"><div className="contact-card-icon">📞</div><h4>Hotline</h4><a href="tel:0988969896" className="contact-link">0988.969.896</a><p>T2–T7: 8:00–18:30</p></div>
                  <div className="contact-card"><div className="contact-card-icon">💬</div><h4>Zalo</h4><a href="https://zalo.me/0988969896" className="contact-link">Chat Ngay</a><p>Phản hồi trong 5–15 phút</p></div>
                  <div className="contact-card"><div className="contact-card-icon">📧</div><h4>Email</h4><a href="mailto:info@japanvip.vn" className="contact-link">info@japanvip.vn</a><p>Phản hồi trong 2–4 giờ</p></div>
                  <div className="contact-card"><div className="contact-card-icon">📍</div><h4>Địa Chỉ</h4><p>115 Đinh Tiên Hoàng, Hải Phòng<br/>21 Lê Văn Lương, Hà Nội</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="toast" id="toast"></div>

      <div className="modal-overlay" id="bid-modal-overlay" style={{display:'none'}}>
        <div className="modal">
          <div className="modal-header">
            <h3>🔨 Xác Nhận Đặt Giá</h3>
            <button className="modal-close" onClick={() => (window as any).closeBidModal?.()}>✕</button>
          </div>
          <div className="modal-body">
            <p>Bạn sắp đặt giá cho:</p>
            <div className="modal-product">🍚 Nồi Cơm Tiger JKT-S18W</div>
            <div className="modal-bid-amount">3,250,000₫</div>
            <p className="modal-note">Bằng cách xác nhận, bạn cam kết thanh toán nếu thắng đấu giá.</p>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={() => (window as any).closeBidModal?.()}>Hủy</button>
            <button className="btn-primary" onClick={() => (window as any).confirmBid?.()}>Xác Nhận Đặt Giá</button>
          </div>
        </div>
      </div>

      <Script src="/app.js" strategy="afterInteractive" />
    </>
  )
}
