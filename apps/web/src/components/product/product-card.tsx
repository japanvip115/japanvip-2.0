import Link from 'next/link'
import Image from 'next/image'
import type { Product, ProductImage, Category, Brand } from '@japanvip/db'

type ProductWithRelations = Product & {
  images: ProductImage[]
  category: Pick<Category, 'name'> | null
  brand: Pick<Brand, 'name'> | null
  _count?: { auctions: number }
}

const BADGE_CONFIG: Record<string, { label: string; cls: string }> = {
  NEW_ARRIVAL: { label: '🆕 Mới',        cls: 'bg-emerald-500 text-white' },
  SOLD_OUT:    { label: '✅ Đã Bán',     cls: 'bg-blue-500 text-white' },
  ORDER_ONLY:  { label: '📦 Hàng Order', cls: 'bg-amber-500 text-white' },
}

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null

  return (
    <Link href={`/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {image ? (
            <Image
              src={image.url}
              alt={image.altText ?? product.name}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl text-gray-200">📦</div>
          )}
          {badge && (
            <span className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {(product.brand || product.category) && (
            <p className="mb-1 truncate text-xs text-gray-400">
              {product.brand?.name}
              {product.brand && product.category && ' · '}
              {product.category?.name}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-brand-red transition-colors">
            {product.name}
          </h3>

          {product.salePrice && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-brand-red">
                {Number(product.salePrice).toLocaleString('vi-VN')}₫
              </span>
              {product.marketPrice && Number(product.marketPrice) > Number(product.salePrice) && (
                <span className="text-xs text-gray-400 line-through">
                  {Number(product.marketPrice).toLocaleString('vi-VN')}₫
                </span>
              )}
            </div>
          )}

          {(product._count?.auctions ?? 0) > 0 && (
            <p className="mt-1 text-xs font-medium text-brand-red">
              {product._count!.auctions} phiên đấu giá
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
