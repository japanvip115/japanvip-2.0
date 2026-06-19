import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import Image from 'next/image'
import type { ProductStatus } from '@japanvip/db'
import { Plus, ImageOff, Link2, Home } from 'lucide-react'
import { ProductActions } from '@/components/admin/product-actions'

export const metadata: Metadata = { title: 'Admin — Quản Lý Sản Phẩm' }

const STATUS_TABS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang bán', value: 'ACTIVE' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã bán', value: 'SOLD' },
  { label: 'Lưu kho', value: 'ARCHIVED' },
]

const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  DRAFT: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
  SOLD: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  ARCHIVED: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Bản nháp',
  SOLD: 'Đã bán',
  ARCHIVED: 'Lưu kho',
}

type SearchParams = Promise<{ status?: string; page?: string; q?: string; categoryId?: string }>

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status = 'ALL', page = '1', q = '', categoryId = '' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const take = 20
  const skip = (pageNum - 1) * take

  const where = {
    ...(status !== 'ALL' ? { status: status as ProductStatus } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        _count: { select: { auctions: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản Lý Sản Phẩm</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 cursor-pointer"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
          <Link
            href="/admin/products/import-url"
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/20 cursor-pointer"
          >
            <Link2 className="h-4 w-4" /> Nhập từ URL
          </Link>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Thêm thủ công
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <form method="GET" className="flex flex-1 gap-2 max-w-lg">
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="categoryId" value={categoryId} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm tên, slug sản phẩm..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            />
            <button type="submit" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer">
              Tìm
            </button>
          </form>
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="q" value={q} />
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer">Lọc</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/products?status=${tab.value}&q=${q}&categoryId=${categoryId}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === tab.value
                  ? 'bg-red-600 text-white'
                  : 'border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Danh mục / Thương hiệu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Đấu giá</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày tạo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                      {product.images[0] ? (
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-700">
                          <Image src={product.images[0].url} alt="" fill className="object-cover" sizes="40px" unoptimized={!product.images[0].url.includes('media.japanvip.vn')} />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-700/30">
                          <ImageOff className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate text-sm font-medium text-gray-300 hover:text-white">
                          {product.name}
                        </p>
                        <p className="font-mono text-xs text-gray-500">{product.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300">{product.category?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{product.brand?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[product.status as ProductStatus]}`}>
                      {STATUS_LABELS[product.status as ProductStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {product._count.auctions}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="whitespace-nowrap text-xs font-medium text-red-400 hover:underline"
                      >
                        Chi tiết
                      </Link>
                      <ProductActions
                        productId={product.id}
                        status={product.status as 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'}
                        auctionCount={product._count.auctions}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Trang {pageNum} / {totalPages}</span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={`/admin/products?status=${status}&q=${q}&categoryId=${categoryId}&page=${pageNum - 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
              >
                ← Trước
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`/admin/products?status=${status}&q=${q}&categoryId=${categoryId}&page=${pageNum + 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
              >
                Sau →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
