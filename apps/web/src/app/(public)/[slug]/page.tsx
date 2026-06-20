import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductTabs } from '@/components/product/product-tabs'
import { RelatedProducts } from '@/components/product/related-products'
import { RecentlyViewed } from '@/components/product/recently-viewed'
import { AuctionCard } from '@/components/auction/auction-card'
import { AddToCartButtons } from '@/components/product/add-to-cart-buttons'
import type { ProductCondition } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'

type Props = { params: Promise<{ slug: string }> }

const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: 'Mới 100%', LIKE_NEW: 'Như mới', GOOD: 'Tốt', FAIR: 'Khá',
}

const CONDITION_COLORS: Record<ProductCondition, string> = {
  NEW: 'bg-green-100 text-green-700',
  LIKE_NEW: 'bg-blue-100 text-blue-700',
  GOOD: 'bg-yellow-100 text-yellow-700',
  FAIR: 'bg-gray-100 text-gray-600',
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

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  const isAdmin = hasRole((session?.user as any)?.role, 'ADMIN')

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

      {isAdmin && (
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={`/admin/products/${product.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-gray-900 shadow hover:bg-amber-300 transition-colors"
          >
            ✏️ Sửa sản phẩm này
          </Link>
          <span className="text-xs text-gray-400">Chỉ admin thấy nút này</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
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

          {/* Brand + condition */}
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
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONDITION_COLORS[product.condition as ProductCondition]}`}>
              {CONDITION_LABELS[product.condition as ProductCondition]}
            </span>
          </div>

          {/* Price */}
          <div className="py-3 border-y border-gray-100">
            {liveAuction ? (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Giá đấu giá hiện tại</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-brand-red">{formatVND(Number(liveAuction.currentPrice))}</span>
                  <span className="flex items-center gap-1 rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{liveAuction.bidCount} lượt đặt giá</p>
              </div>
            ) : product.salePrice ? (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-brand-red">{formatVND(Number(product.salePrice))}</span>
                  {product.marketPrice && Number(product.marketPrice) > Number(product.salePrice) && (
                    <>
                      <span className="text-base text-gray-400 line-through">{formatVND(Number(product.marketPrice))}</span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                        -{Math.round((1 - Number(product.salePrice) / Number(product.marketPrice)) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : product.originPrice ? (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
                <span className="text-3xl font-bold text-brand-red">{formatVND(Number(product.originPrice))}</span>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
                <span className="text-2xl font-bold text-brand-red">Liên hệ để biết giá</span>
              </div>
            )}
          </div>

          {/* Star rating */}
          {product.rating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((s) => {
                  const r = Number(product.rating)
                  return (
                    <svg key={s} className={`h-4 w-4 ${s <= Math.round(r) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  )
                })}
              </div>
              <span className="text-sm font-bold text-gray-800">{Number(product.rating).toFixed(1)}</span>
              {product.reviewCount > 0 && (
                <span className="text-xs text-gray-400">({product.reviewCount} đánh giá)</span>
              )}
            </div>
          )}

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

          {/* Short bullets */}
          <ul className="space-y-1.5 text-sm font-semibold text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              Hàng nội địa Nhật Bản mới 100%, nguyên hộp
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              Nhập khẩu trực tiếp, có tem nhập khẩu đầy đủ
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-500">✓</span>
              Miễn phí vận chuyển toàn quốc
            </li>
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
            <div className="flex gap-2 px-4 py-2.5">
              <span className="w-28 shrink-0 font-semibold text-gray-600">Xuất xứ:</span>
              <span className="text-gray-800">Nhật Bản</span>
            </div>
            <div className="flex gap-2 px-4 py-2.5">
              <span className="w-28 shrink-0 font-semibold text-gray-600">Tình trạng:</span>
              <span className="text-gray-800">{CONDITION_LABELS[product.condition as ProductCondition]}</span>
            </div>
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
          </div>

          {/* Giao hàng */}
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="text-3xl shrink-0">🚚</span>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-center gap-1.5"><span className="text-blue-400">✔</span> Giao hàng trong 2 giờ (HN &amp; TP. HCM)</li>
              <li className="flex items-center gap-1.5"><span className="text-blue-400">✔</span> Miễn phí ship toàn quốc</li>
              <li className="flex items-center gap-1.5"><span className="text-blue-400">✔</span> Hướng dẫn sử dụng sản phẩm tại nhà</li>
            </ul>
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
                <p className="text-xs font-semibold text-gray-500">Hotline tư vấn:</p>
                <p className="text-base font-bold text-gray-900 group-hover:text-brand-red transition">0988.969.896</p>
              </div>
            </a>

            {/* Divider */}
            <div className="text-gray-200 text-lg select-none">|</div>

            {/* Share */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">Chia sẻ:</span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://store.japanvip.vn/${product.slug}`)}`}
                target="_blank" rel="noopener noreferrer"
                title="Chia sẻ Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </a>
              <a
                href="https://zalo.me/0988969896"
                target="_blank" rel="noopener noreferrer"
                title="Liên hệ Zalo"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068FF] text-white hover:opacity-90 transition shadow-sm text-xs font-extrabold tracking-tight"
              >
                Zalo
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content + Sidebar layout */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:items-start">

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
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24">

          {/* Liên hệ */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Liên hệ tư vấn</p>
            <a href="tel:09272988888" className="flex items-center gap-3 group">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-brand-red">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6.5C2 14.508 9.492 22 17.5 22c.98 0 1.863-.14 2.668-.386a1 1 0 00.63-.593l1.5-4a1 1 0 00-.298-1.1l-2.5-2a1 1 0 00-1.173-.044l-1.5 1A9.956 9.956 0 0111.12 9.12l1-1.5a1 1 0 00-.044-1.173l-2-2.5a1 1 0 00-1.1-.298l-4 1.5a1 1 0 00-.593.63C2.14 6.637 2 7.52 2 6.5z"/></svg>
              </span>
              <div>
                <p className="text-xs text-gray-400">Hotline</p>
                <p className="text-base font-bold text-gray-900 group-hover:text-brand-red transition">09.2729.8888</p>
              </div>
            </a>
            <a href="tel:0988969896" className="flex items-center gap-3 group">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-brand-red">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6.5C2 14.508 9.492 22 17.5 22c.98 0 1.863-.14 2.668-.386a1 1 0 00.63-.593l1.5-4a1 1 0 00-.298-1.1l-2.5-2a1 1 0 00-1.173-.044l-1.5 1A9.956 9.956 0 0111.12 9.12l1-1.5a1 1 0 00-.044-1.173l-2-2.5a1 1 0 00-1.1-.298l-4 1.5a1 1 0 00-.593.63C2.14 6.637 2 7.52 2 6.5z"/></svg>
              </span>
              <div>
                <p className="text-xs text-gray-400">Di động</p>
                <p className="text-base font-bold text-gray-900 group-hover:text-brand-red transition">0988.969.896</p>
              </div>
            </a>
            <div className="flex gap-2 pt-1">
              <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0068FF] py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
                Zalo
              </a>
              <a href="https://www.facebook.com/japanvip" target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1877F2] py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
                Facebook
              </a>
            </div>
          </div>

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

          {/* Placeholder sản phẩm — sẽ thêm sau */}
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
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            image: product.images.map((i) => i.url),
            brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
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
          }),
        }}
      />
    </div>
  )
}
