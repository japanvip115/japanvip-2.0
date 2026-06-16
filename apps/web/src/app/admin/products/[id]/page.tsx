import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/admin/product-form'
import { ProductPriceForm } from '@/components/admin/product-price-form'
import { ProductClassificationForm } from '@/components/admin/product-classification-form'
import { ProductSeoForm } from '@/components/admin/product-seo-form'
import { ProductImagesManager } from '@/components/admin/product-images-manager'
import { ProductAttributesManager } from '@/components/admin/product-attributes-manager'
import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import type { ProductStatus } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import { ProductPublishButton } from '@/components/admin/product-publish-button'

type Props = { params: Promise<{ id: string }> }

const STATUS_CONFIG: Record<ProductStatus, { label: string; cls: string }> = {
  ACTIVE:   { label: 'Đang bán',  cls: 'bg-green-500/15 text-green-400 ring-green-500/20' },
  DRAFT:    { label: 'Bản nháp', cls: 'bg-gray-500/15 text-gray-400 ring-gray-500/20' },
  SOLD:     { label: 'Đã bán',   cls: 'bg-blue-500/15 text-blue-400 ring-blue-500/20' },
  ARCHIVED: { label: 'Lưu kho',  cls: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/20' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } })
  return { title: `Admin — ${product?.name ?? 'Sản phẩm'}` }
}

export const dynamic = 'force-dynamic'

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        attributes: { orderBy: { name: 'asc' } },
        auctions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, auctionNumber: true, status: true, currentPrice: true, bidCount: true, endsAt: true },
        },
      },
    }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  const statusCfg = STATUS_CONFIG[product.status as ProductStatus]

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/admin/products" className="hover:text-gray-300 transition-colors">Sản phẩm</Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-gray-400 max-w-[240px]">{product.name}</span>
          </div>
          {/* Title + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate max-w-lg">{product.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-gray-600">{product.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="submit"
            form="product-edit-form"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
          >
            Lưu thay đổi
          </button>
          <ProductPublishButton
            productId={product.id}
            status={product.status as 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'}
          />
          <Link
            href="/admin/auctions/new"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo phiên đấu giá
          </Link>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left: Edit form */}
        <div className="xl:col-span-2 space-y-5">
          <ProductForm
            mode="edit"
            productId={product.id}
            initialData={{
              name: product.name,
              slug: product.slug,
              description: product.description ?? '',
            }}
          />
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Quick stats */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Thông tin</h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Trạng thái', value: <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusCfg.cls}`}>{statusCfg.label}</span> },
                { label: 'Danh mục', value: product.category?.name ?? '—' },
                { label: 'Thương hiệu', value: product.brand?.name ?? '—' },
                { label: 'Tổng đấu giá', value: product.auctions.length },
                { label: 'Ngày tạo', value: new Date(product.createdAt).toLocaleDateString('vi-VN') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="text-xs font-medium text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Price editor */}
          <ProductPriceForm
            productId={product.id}
            initialSalePrice={product.salePrice ? Number(product.salePrice) : null}
            initialMarketPrice={product.marketPrice ? Number(product.marketPrice) : null}
            initialRating={product.rating ? Number(product.rating) : null}
            initialReviewCount={product.reviewCount ?? 0}
          />

          {/* Recent auctions */}
          {product.auctions.length > 0 && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
              <div className="border-b border-gray-700 px-5 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phiên đấu giá gần đây</h3>
              </div>
              <div className="divide-y divide-gray-700/50">
                {product.auctions.map((a) => (
                  <Link
                    key={a.id}
                    href={`/admin/auctions/${a.id}`}
                    className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-700/40"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-500 group-hover:text-gray-400">{a.auctionNumber}</p>
                      <p className="text-xs font-medium text-gray-200">{Number(a.currentPrice).toLocaleString('vi-VN')}₫</p>
                      <p className="text-xs text-gray-600">{a.bidCount} lượt đặt</p>
                    </div>
                    <span className={`text-xs font-semibold ${a.status === 'LIVE' ? 'text-green-400' : 'text-gray-600'}`}>
                      {a.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Classification + Images side by side ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ProductClassificationForm
          productId={product.id}
          categories={categories}
          brands={brands}
          initialCategoryId={product.categoryId ?? ''}
          initialBrandId={product.brandId ?? ''}
          initialOwnerType={product.ownerType as 'JAPANVIP' | 'PARTNER'}
          initialCondition={product.condition as 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'}
          initialStatus={product.status as 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'}
          initialBadge={(product.badge as 'NEW_ARRIVAL' | 'SOLD_OUT' | 'ORDER_ONLY' | null) ?? null}
          initialOriginUrl={product.originUrl ?? ''}
        />
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-200">Hình Ảnh Sản Phẩm</h3>
          <ProductImagesManager
            productId={product.id}
            initialImages={product.images.map((img) => ({
              id: img.id,
              url: img.url,
              altText: img.altText ?? '',
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            }))}
          />
        </div>
      </div>

      {/* ── SEO ── */}
      <ProductSeoForm
        productId={product.id}
        initialMetaTitle={product.metaTitle ?? ''}
        initialMetaDesc={product.metaDesc ?? ''}
      />

      {/* ── Attributes ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-200">Thông Số Kỹ Thuật</h2>
        <ProductAttributesManager
          productId={product.id}
          initialAttributes={product.attributes.map((a) => ({
            id: a.id,
            name: a.name,
            value: a.value,
          }))}
        />
      </div>
    </div>
  )
}
