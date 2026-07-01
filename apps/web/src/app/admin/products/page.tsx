import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import type { ProductStatus } from '@japanvip/db'
import { Plus, Link2, Home } from 'lucide-react'
import { ProductsTableClient, type ProductRow } from './products-table-client'

export const metadata: Metadata = { title: 'Admin — Quản Lý Sản Phẩm' }

const STATUS_TABS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang bán', value: 'ACTIVE' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã bán', value: 'SOLD' },
  { label: 'Lưu kho', value: 'ARCHIVED' },
]

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

  const returnTo = `/admin/products?status=${status}&q=${q}&categoryId=${categoryId}&page=${pageNum}`
  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.images[0]?.url ?? null,
    categoryName: p.category?.name ?? null,
    brandName: p.brand?.name ?? null,
    status: p.status as ProductRow['status'],
    auctionCount: p._count.auctions,
    createdAt: p.createdAt.toISOString(),
  }))

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

      {/* Table + chọn/xoá hàng loạt */}
      <ProductsTableClient products={rows} returnTo={returnTo} />

      {/* Pagination */}
      {totalPages > 1 && (() => {
        const delta = 2
        const pages: (number | '...')[] = []
        const left = Math.max(2, pageNum - delta)
        const right = Math.min(totalPages - 1, pageNum + delta)
        pages.push(1)
        if (left > 2) pages.push('...')
        for (let i = left; i <= right; i++) pages.push(i)
        if (right < totalPages - 1) pages.push('...')
        if (totalPages > 1) pages.push(totalPages)
        const base = `/admin/products?status=${status}&q=${q}&categoryId=${categoryId}`
        const btnCls = 'rounded-lg border px-3 py-1 text-sm font-medium transition-colors'
        const activeCls = `${btnCls} border-red-500 bg-red-600 text-white`
        const normalCls = `${btnCls} border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-700 hover:text-white`
        const disabledCls = `${btnCls} border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed`
        return (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Trang {pageNum} / {totalPages} &nbsp;·&nbsp; {total} sản phẩm</span>
            <div className="flex items-center gap-1">
              {pageNum > 1 ? (
                <Link href={`${base}&page=${pageNum - 1}`} className={normalCls}>← Trước</Link>
              ) : (
                <span className={disabledCls}>← Trước</span>
              )}
              {pages.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-gray-600">…</span>
                ) : (
                  <Link key={p} href={`${base}&page=${p}`} className={p === pageNum ? activeCls : normalCls}>
                    {p}
                  </Link>
                )
              )}
              {pageNum < totalPages ? (
                <Link href={`${base}&page=${pageNum + 1}`} className={normalCls}>Sau →</Link>
              ) : (
                <span className={disabledCls}>Sau →</span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
