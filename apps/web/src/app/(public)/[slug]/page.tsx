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
  const specAttributes = product.attributes.filter(
    (a) => !a.name.startsWith('[promo]') && !a.name.startsWith('[warranty]'),
  )

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

          {/* Promo & Warranty box — editable via product attributes with [promo] / [warranty] prefix */}
          {(promoItems.length > 0 || warrantyItems.length > 0) && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
              <p className="flex items-center gap-2 font-semibold text-gray-800">
                🎁 Khuyến Mãi &amp; Bảo Hành
              </p>
              {promoItems.length > 0 && (
                <div className="space-y-1.5 text-sm text-gray-700">
                  <p className="font-medium text-gray-800">Khuyến mãi:</p>
                  <ul className="space-y-1 pl-1">
                    {promoItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {item.value || item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warrantyItems.length > 0 && (
                <div className="space-y-1.5 text-sm text-gray-700 pt-2 border-t border-red-100">
                  <p className="font-medium text-gray-800">Bảo hành:</p>
                  <ul className="space-y-1 pl-1">
                    {warrantyItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {item.value || item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Quà tặng */}
          {Array.isArray(product.gifts) && (product.gifts as {name:string;price?:number;image?:string}[]).length > 0 && (
            <div className="inline-flex rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-brand-red px-2.5 py-1 text-[11px] font-bold text-white shrink-0">🎁 Quà tặng</span>
                {(product.gifts as {name:string;price?:number;image?:string}[]).map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1">
                    <span className="text-sm leading-none">🎁</span>
                    <span className="text-xs font-medium text-gray-700">{g.name}</span>
                    {g.price && g.price > 0 && (
                      <span className="text-[11px] font-semibold text-brand-red">({g.price.toLocaleString('vi-VN')}₫)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* Tabs: Mô tả + Thông số kỹ thuật + Đánh giá */}
      <ProductTabs
        description={product.description}
        attributes={specAttributes}
        productId={product.id}
        productName={product.name}
      />

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
