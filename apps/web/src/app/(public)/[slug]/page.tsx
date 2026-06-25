import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { unstable_cache } from 'next/cache'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductTabs } from '@/components/product/product-tabs'
import { RelatedProducts } from '@/components/product/related-products'
import { RecentlyViewed } from '@/components/product/recently-viewed'
import { AuctionCard } from '@/components/auction/auction-card'
import { AddToCartButtons } from '@/components/product/add-to-cart-buttons'
import { ProductPrice } from '@/components/product/product-price'
import { AdminEditButton } from '@/components/product/admin-edit-button'
import { getActiveExchangeRate } from '@/modules/bfj/services/exchange-rate.service'
import type { ProductCondition } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'

// Bọc cache để Redis (fetch no-store) trong exchange-rate không ép trang render động
const getRateCached = unstable_cache(getActiveExchangeRate, ['exchange-rate-v1'], { revalidate: 300, tags: ['exchange-rate'] })
const getProductContent = unstable_cache(
  async () => prisma.siteSetting.findMany({ where: { key: { in: ['product.commitments', 'product.shipping_notes'] } } }),
  ['product-content-v1'],
  { revalidate: 300, tags: ['site-config'] }
)
// Công tắc hiện đánh giá sao ở trang SP (admin: Cài đặt → Đánh Giá Khách Hàng). Mặc định TẮT.
const getProductReviewsEnabled = unstable_cache(
  async () => (await prisma.siteSetting.findUnique({ where: { key: 'product_reviews_enabled' } }))?.value === 'true',
  ['product-reviews-enabled-v1'],
  { revalidate: 300, tags: ['site-config'] }
)

type Props = { params: Promise<{ slug: string }> }

const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: 'Mới 100%', LIKE_NEW: 'Như mới', GOOD: 'Tốt', FAIR: 'Khá',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true, metaTitle: true, metaDesc: true, description: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  })
  if (!product) return { title: 'Không tìm thấy — Japan VIP' }

  const title = product.metaTitle ?? `${product.name} | Japan VIP`
  const description = product.metaDesc ?? product.description ?? `${product.name} — Hàng gia dụng nội địa Nhật Bản chính hãng tại Japan VIP.`
  const image = product.images[0]?.url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image, width: 800, height: 800 }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export const revalidate = 300

// Pre-render SP đang bán tại build → cache CDN (●). SP mới render on-demand + cache (ISR).
// Bắt buộc có để route [slug] bật chế độ ISR thay vì full-dynamic.
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { slug: true },
  })
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug, status: 'ACTIVE' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, logoUrl: true } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      attributes: { orderBy: { name: 'asc' } },
      auctions: {
        where: { status: { in: ['LIVE', 'SCHEDULED'] } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              category: { select: { name: true } },
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!product) notFound()

  const liveAuction = product.auctions.find((a) => a.status === 'LIVE')

  // Nội dung khối phải (admin tự sửa: Cài đặt → Nội dung trang sản phẩm) — cache
  const contentSettings = await getProductContent()
  const reviewsEnabled = await getProductReviewsEnabled()
  const splitLines = (s: string | undefined, fallback: string) => (s ?? fallback).split('\n').map((l) => l.trim()).filter(Boolean)
  const commitmentLines = splitLines(contentSettings.find((r) => r.key === 'product.commitments')?.value, 'Hàng nội địa Nhật Bản mới 100%, nguyên hộp\nNhập khẩu trực tiếp, có tem nhập khẩu đầy đủ\nMiễn phí vận chuyển toàn quốc')
  const shippingLines = splitLines(contentSettings.find((r) => r.key === 'product.shipping_notes')?.value, 'Giao hàng trong 2 giờ (HN & TP. HCM)\nMiễn phí ship toàn quốc\nHướng dẫn sử dụng sản phẩm tại nhà')

  // ── Pre Order (lead-gen): hàng ORDER_ONLY hiện giá Nhật, ẩn giá VN tới khi khách đăng nhập ──
  // Login state xử lý CLIENT-side (ProductPrice) để trang render TĨNH.
  const isPreOrder = product.badge === 'ORDER_ONLY'
  const japanPriceJpy = (() => {
    const raw = product.attributes.find((a) => a.name === '[japan_price]')?.value
    const n = raw ? parseInt(raw.replace(/[^0-9]/g, ''), 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
  })()
  let japanPriceVnd: number | null = null
  if (isPreOrder && japanPriceJpy) {
    const rate = await getRateCached()
    japanPriceVnd = Math.round(japanPriceJpy * rate.rate)
  }

  // Fetch related products: same category first, fallback to other active products
  const relatedSelect = {
    id: true, name: true, slug: true, originPrice: true,
    brand: { select: { name: true } },
    images: { where: { isPrimary: true }, take: 1, select: { url: true } },
  } as const

  let relatedProducts = product.category
    ? await prisma.product.findMany({
        where: { status: 'ACTIVE', categoryId: product.category.id, id: { not: product.id } },
        take: 10, orderBy: { createdAt: 'desc' }, select: relatedSelect,
      })
    : []

  // Fallback: if fewer than 3 same-category products, fill with other active products
  if (relatedProducts.length < 3) {
    const exclude = [product.id, ...relatedProducts.map((p) => p.id)]
    const extra = await prisma.product.findMany({
      where: { status: 'ACTIVE', id: { notIn: exclude } },
      take: 10 - relatedProducts.length,
      orderBy: { createdAt: 'desc' },
      select: relatedSelect,
    })
    relatedProducts = [...relatedProducts, ...extra]
  }

  // Separate special attributes from tech specs
  const promoItems = product.attributes
    .filter((a) => a.name.startsWith('[promo]'))
    .map((a) => ({ ...a, name: a.name.replace('[promo]', '').trim() }))
  const warrantyItems = product.attributes
    .filter((a) => a.name.startsWith('[warranty]'))
    .map((a) => ({ ...a, name: a.name.replace('[warranty]', '').trim() }))
  const quickItems = product.attributes
    .filter((a) => a.name.startsWith('[quick]'))
    .map((a) => ({ ...a, name: a.name.replace('[quick]', '').trim() }))
  const faqItems = product.attributes
    .filter((a) => a.name.startsWith('[faq]'))
    .map((a) => ({ ...a, name: a.name.replace('[faq]', '').trim() }))
  const videoItems = product.attributes
    .filter((a) => a.name.startsWith('[video]'))
    .map((a) => ({ ...a, name: a.name.replace('[video]', '').trim() }))

  // Grouped vs ungrouped tech specs
  const SPECIAL = ['[promo]', '[warranty]', '[quick]', '[faq]', '[video]']
  const rawSpecs = product.attributes.filter((a) => !SPECIAL.some((p) => a.name.startsWith(p)))

  type SpecGroup = { group: string; items: typeof rawSpecs }
  const specGroups: SpecGroup[] = []
  const specAttributes: typeof rawSpecs = []
  for (const attr of rawSpecs) {
    const m = attr.name.match(/^\[group:([^\]]+)\](.*)$/)
    if (m) {
      const group = m[1]!.trim()
      const name = m[2]!.trim()
      const existing = specGroups.find((g) => g.group === group)
      if (existing) existing.items.push({ ...attr, name })
      else specGroups.push({ group, items: [{ ...attr, name }] })
    } else {
      specAttributes.push(attr)
    }
  }

  return (
    <div className="container pt-12 pb-8">

      <AdminEditButton productId={product.id} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
        {/* Gallery */}
        <div className="mt-6">
          <ProductGallery
            images={product.images.map((img) => ({
              id: img.id,
              url: img.url,
              altText: img.altText,
              isPrimary: img.isPrimary,
            }))}
            productName={product.name}
          />
        </div>

        {/* Info panel */}
        <div className="space-y-5">
          <h1 className="mt-6 text-lg font-bold leading-snug text-gray-900 md:text-xl line-clamp-2">
            {product.name}
          </h1>

          {/* Brand + stars — cùng 1 khối, sát nhau */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {product.brand && (
                <Link href={`/san-pham?brandId=${product.brand.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <span className="text-sm font-semibold text-gray-700">Thương hiệu:</span>
                  {product.brand.logoUrl ? (
                    <Image
                      src={product.brand.logoUrl}
                      alt={product.brand.name}
                      width={64}
                      height={24}
                      className="h-6 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-brand-red">{product.brand.name}</span>
                  )}
                </Link>
              )}
            </div>

          {/* Star rating — dưới thương hiệu */}
          {reviewsEnabled && (() => {
            const rating = product.rating ? Number(product.rating) : 5
            const count = product.reviewCount > 0 ? product.reviewCount : 5
            // Số đã bán: seed từ tên SP để ổn định (500–950)
            let h = 2166136261
            for (let i = 0; i < product.name.length; i++) { h ^= product.name.charCodeAt(i); h = Math.imul(h, 16777619) }
            const sold = 500 + (Math.abs(h >>> 0) % 451)
            return (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-800">{rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({count} đánh giá)</span>
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-xs text-gray-500">Đã bán: <span className="font-semibold">{sold.toLocaleString('vi-VN')}</span></span>
              </div>
            )
          })()}
          </div>

          {/* Price — client-side để render tĩnh (cổng giá pre-order theo login) */}
          <ProductPrice
            slug={product.slug}
            isPreOrder={isPreOrder}
            japanPriceJpy={japanPriceJpy}
            japanPriceVnd={japanPriceVnd}
            salePrice={product.salePrice ? Number(product.salePrice) : null}
            marketPrice={product.marketPrice ? Number(product.marketPrice) : null}
            originPrice={product.originPrice ? Number(product.originPrice) : null}
            liveAuction={liveAuction ? { currentPrice: Number(liveAuction.currentPrice), bidCount: liveAuction.bidCount } : null}
          />

          {/* Xuất xứ + Tình trạng — ngay dưới giá để khẳng định hàng mới */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-600">Xuất xứ:</span>
              <span className="font-medium text-gray-800">Nhật Bản</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-600">Tình trạng:</span>
              {product.condition === 'NEW' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="text-emerald-500">✓</span>
                  {CONDITION_LABELS[product.condition as ProductCondition]}
                </span>
              ) : (
                <span className="font-medium text-gray-800">{CONDITION_LABELS[product.condition as ProductCondition]}</span>
              )}
            </div>
          </div>

          {/* Quick specs strip */}
          {quickItems.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm">
              {quickItems.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className="text-gray-500">{item.name}:</span>
                  <span className="font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Short bullets — admin sửa ở Cài đặt → Nội dung trang sản phẩm */}
          <ul className="space-y-1.5 text-sm font-semibold text-gray-700">
            {commitmentLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500">✓</span>
                {line}
              </li>
            ))}
          </ul>

          {/* Quà tặng box */}
          {Array.isArray(product.gifts) && (product.gifts as {name:string;price?:number;image?:string}[]).length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                🎁 Quà tặng kèm theo
              </p>
              <div className="space-y-2">
                {(product.gifts as {name:string;price?:number;image?:string}[]).map((g, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-white border border-orange-100 px-3 py-2">
                    {g.image ? (
                      <Image src={g.image} alt={g.name} width={40} height={40} className="h-10 w-10 rounded object-contain shrink-0" />
                    ) : (
                      <span className="text-xl shrink-0">🎁</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{g.name}</p>
                      {g.price && g.price > 0 && (
                        <p className="text-xs text-orange-600 font-bold">{g.price.toLocaleString('vi-VN')}₫</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product info summary */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 text-sm">
            {quickItems.filter(q => q.name.toLowerCase().includes('điện áp') || q.name.toLowerCase().includes('dien ap')).map(q => (
              <div key={q.id} className="flex gap-2 px-4 py-2.5">
                <span className="w-28 shrink-0 font-semibold text-gray-600">Điện áp:</span>
                <span className="text-gray-800">{q.value}</span>
              </div>
            ))}
            {promoItems.length > 0 && (
              <div className="px-4 py-2.5">
                <p className="font-semibold text-gray-600 mb-1.5">Tính năng nổi bật:</p>
                <ul className="space-y-1">
                  {promoItems.map(item => (
                    <li key={item.id} className="flex items-start gap-1.5">
                      <span className="text-blue-500 shrink-0 font-bold">✔</span>
                      <span className="text-gray-700">{item.value || item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {warrantyItems.map(item => (
              <div key={item.id} className="flex gap-2 px-4 py-2.5">
                <span className="w-28 shrink-0 font-semibold text-brand-red">Bảo hành điện tử:</span>
                <span className="font-bold text-brand-red">{item.value || item.name}</span>
              </div>
            ))}
            {warrantyItems.length > 0 && (
              <div className="px-4 py-2 text-xs italic text-gray-400">
                * Bảo hành trực tiếp tại nhà – khu vực Hà Nội và TP. Hồ Chí Minh
              </div>
            )}
            {/* Giao hàng — gộp chung ô */}
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="text-3xl shrink-0">🚚</span>
              <ul className="space-y-1 text-sm text-gray-700">
                {shippingLines.map((line, i) => (
                  <li key={i} className="flex items-center gap-1.5"><span className="text-blue-400">✔</span> {line}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA buttons */}
          {liveAuction ? (
            <Link
              href={`/dau-gia/${liveAuction.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-4 text-base font-bold text-white hover:bg-red-700 transition"
            >
              🔨 Vào đặt giá ngay →
            </Link>
          ) : (
            <AddToCartButtons
              productId={product.id}
              slug={product.slug}
              name={product.name}
              image={product.images[0]?.url ?? null}
              priceJpy={null}
              priceVnd={
                product.salePrice ? Number(product.salePrice)
                : product.originPrice ? Number(product.originPrice)
                : null
              }
            />
          )}

          {/* Contact + Share row */}
          <div className="flex items-center gap-3">
            {/* Hotline */}
            <a
              href="tel:0988969896"
              className="flex flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-red-50 hover:border-red-100 transition group"
            >
              <svg className="h-5 w-5 shrink-0 text-brand-red" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6.5C2 14.508 9.492 22 17.5 22c.98 0 1.863-.14 2.668-.386a1 1 0 00.63-.593l1.5-4a1 1 0 00-.298-1.1l-2.5-2a1 1 0 00-1.173-.044l-1.5 1A9.956 9.956 0 0111.12 9.12l1-1.5a1 1 0 00-.044-1.173l-2-2.5a1 1 0 00-1.1-.298l-4 1.5a1 1 0 00-.593.63C2.14 6.637 2 7.52 2 6.5z"/></svg>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500">Hotline:</p>
                <p className="text-base font-bold text-gray-900 group-hover:text-brand-red transition">0988.969.896</p>
              </div>
            </a>

            {/* Divider */}
            <div className="text-gray-200 text-lg select-none">|</div>

            {/* Share — kiểu Shopee */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm text-gray-500 shrink-0">Chia sẻ:</span>
              {/* Messenger */}
              <a
                href={`fb-messenger://share/?link=${encodeURIComponent(`https://store.japanvip.vn/${product.slug}`)}`}
                target="_blank" rel="noopener noreferrer" title="Chia sẻ Messenger"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#00B2FF] to-[#006AFF] text-white hover:opacity-90 transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.14 2 11.25c0 2.88 1.4 5.45 3.6 7.13V22l3.3-1.81c.88.24 1.82.37 2.8.37 5.5 0 10-4.14 10-9.25S17.5 2 12 2zm1 12.46l-2.55-2.72-4.97 2.72 5.47-5.81 2.61 2.72 4.91-2.72-5.47 5.81z"/></svg>
              </a>
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://store.japanvip.vn/${product.slug}`)}`}
                target="_blank" rel="noopener noreferrer" title="Chia sẻ Facebook"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </a>
              {/* Pinterest */}
              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`https://store.japanvip.vn/${product.slug}`)}&media=${encodeURIComponent(product.images[0]?.url ?? '')}&description=${encodeURIComponent(product.name)}`}
                target="_blank" rel="noopener noreferrer" title="Chia sẻ Pinterest"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E60023] text-white hover:opacity-90 transition"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.32-.09-.79-.17-2.01.03-2.88.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.81 1.48 1.81 1.78 0 3.15-1.88 3.15-4.58 0-2.4-1.72-4.07-4.18-4.07-2.85 0-4.52 2.13-4.52 4.34 0 .86.33 1.78.74 2.28.08.1.09.19.07.29-.08.31-.25.99-.28 1.13-.04.18-.15.22-.34.13-1.25-.58-2.03-2.4-2.03-3.87 0-3.15 2.29-6.04 6.6-6.04 3.47 0 6.16 2.47 6.16 5.77 0 3.45-2.17 6.22-5.19 6.22-1.01 0-1.97-.53-2.29-1.15l-.62 2.37c-.23.86-.83 1.95-1.24 2.61.93.29 1.92.44 2.95.44 5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
              </a>
              {/* X */}
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://store.japanvip.vn/${product.slug}`)}&text=${encodeURIComponent(product.name)}`}
                target="_blank" rel="noopener noreferrer" title="Chia sẻ X (Twitter)"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white hover:opacity-90 transition"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* Divider */}
              <div className="mx-1 h-5 w-px bg-gray-200" />
              {/* Yêu thích */}
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <svg className="h-4 w-4 fill-none stroke-current text-brand-red" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                Yêu thích
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Content + Sidebar layout */}
      <div className="-mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* Main content: Tabs */}
        <div className="min-w-0">
          <ProductTabs
            description={product.description}
            attributes={specAttributes}
            specGroups={specGroups}
            faqItems={faqItems}
            videoItems={videoItems}
            productId={product.id}
            productName={product.name}
            productImages={product.images.map((img) => img.url)}
            showReviews={reviewsEnabled}
          />
        </div>

        {/* Sidebar — chính sách + showroom + sản phẩm liên quan */}
        <aside className="space-y-4 lg:mt-12 lg:sticky lg:top-24">

          {/* Chính sách bán hàng */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Chính sách bán hàng</p>
            <div className="space-y-3">
              {[
                { icon: '🚚', title: 'Miễn phí giao hàng', sub: 'Tất cả các đơn hàng toàn quốc' },
                { icon: '⚡', title: 'Giao nhanh 2H', sub: 'Hà Nội & Hồ Chí Minh' },
                { icon: '🔧', title: 'Miễn phí lắp đặt', sub: 'Hà Nội, Hồ Chí Minh' },
                { icon: '🔄', title: 'Đổi mới 7 ngày', sub: 'Nếu lỗi do nhà sản xuất' },
                { icon: '🛡️', title: 'Bảo hành điện tử', sub: 'Kích hoạt tại nhà phân phối' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Địa chỉ showroom */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Showroom</p>
            <div className="space-y-2 text-gray-600">
              <div>
                <p className="font-semibold text-gray-800 text-xs">TP. HÀ NỘI</p>
                <p className="text-xs">21 Lê Văn Lương, Thanh Xuân</p>
                <a href="tel:0988969896" className="text-xs text-brand-red font-semibold">0988.969.896</a>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-xs">HẢI PHÒNG (Trụ sở)</p>
                <p className="text-xs">115 Đinh Tiên Hoàng, Hồng Bàng</p>
                <a href="tel:02253822526" className="text-xs text-brand-red font-semibold">0225.3822526</a>
              </div>
            </div>
          </div>

          {/* Sản phẩm liên quan */}
          {relatedProducts.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Sản phẩm liên quan</p>
              <div className="space-y-3">
                {relatedProducts.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/${p.slug}`} className="flex items-center gap-3 group">
                    {p.images[0]?.url ? (
                      <Image src={p.images[0].url} alt={p.name} width={56} height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-medium text-gray-700 group-hover:text-brand-red transition leading-snug">{p.name}</p>
                      {p.originPrice && (
                        <p className="mt-0.5 text-xs font-bold text-brand-red">{formatVND(Number(p.originPrice))}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </aside>
      </div>

      {/* Related auctions */}
      {product.auctions.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Phiên Đấu Giá</h2>
            <Link href="/dau-gia" className="text-sm text-brand-red hover:underline">Xem tất cả →</Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {product.auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction as any} />
            ))}
          </div>
        </section>
      )}

      {/* Related products carousel */}
      <RelatedProducts
        title={product.category ? 'Sản Phẩm Cùng Chuyên Mục' : 'Sản Phẩm Nổi Bật Khác'}
        products={relatedProducts.map((p) => ({
          ...p,
          originPrice: p.originPrice ? Number(p.originPrice) : null,
          images: p.images,
        }))}
      />

      {/* Recently viewed — client-side localStorage */}
      <RecentlyViewed
        current={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          originPrice: product.originPrice ? Number(product.originPrice) : null,
          imageUrl: product.images[0]?.url ?? null,
        }}
      />

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.description,
              image: product.images.map((i) => i.url),
              brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
              ...(reviewsEnabled && product.rating ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: Number(product.rating).toFixed(1),
                  reviewCount: product.reviewCount > 0 ? product.reviewCount : 5,
                  bestRating: '5',
                  worstRating: '1',
                },
              } : {}),
              offers: liveAuction ? {
                '@type': 'Offer',
                price: Number(liveAuction.currentPrice),
                priceCurrency: 'VND',
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: 'Japan VIP' },
              } : product.salePrice ? {
                '@type': 'Offer',
                price: Number(product.salePrice),
                priceCurrency: 'VND',
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: 'Japan VIP' },
              } : undefined,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://japanvip.vn' },
                ...(product.category ? [{ '@type': 'ListItem', position: 2, name: product.category.name, item: `https://japanvip.vn/danh-muc/${product.category.slug}` }] : []),
                { '@type': 'ListItem', position: product.category ? 3 : 2, name: product.name, item: `https://japanvip.vn/${product.slug}` },
              ],
            },
            ...(faqItems.length > 0 ? [{
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqItems.map((f) => ({
                '@type': 'Question',
                name: f.name,
                acceptedAnswer: { '@type': 'Answer', text: f.value },
              })),
            }] : []),
          ]),
        }}
      />
    </div>
  )
}
