import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Suspense } from 'react'
import { ProductCard } from '@/components/product/product-card'
import { SortSelect } from '@/components/product/sort-select'
import type { ProductCondition } from '@japanvip/db'

export const revalidate = 60

type SearchParams = Promise<{
  q?: string
  categoryId?: string
  brandId?: string
  condition?: string
  sort?: string
  page?: string
}>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, categoryId } = await searchParams
  const category = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } })
    : null
  const title = category
    ? `${category.name} — Hàng Nội Địa Nhật | Japan VIP`
    : q
    ? `Tìm kiếm "${q}" — Japan VIP`
    : 'Sản Phẩm Gia Dụng Nhật Bản — Japan VIP'
  return {
    title,
    description: 'Hàng gia dụng nội địa Nhật Bản chính hãng: bếp từ, máy giặt, nồi cơm điện, tủ lạnh và hơn 1000 sản phẩm đang chờ bạn.',
    openGraph: { title, type: 'website' },
  }
}

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Mới nhất' },
  { value: 'name_asc', label: 'Tên A→Z' },
  { value: 'name_desc', label: 'Tên Z→A' },
]

const CONDITION_OPTIONS: { value: ProductCondition; label: string }[] = [
  { value: 'NEW',      label: 'Mới 100%' },
  { value: 'LIKE_NEW', label: 'Như mới' },
  { value: 'GOOD',     label: 'Tốt' },
  { value: 'FAIR',     label: 'Khá' },
]

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '', categoryId = '', brandId = '', condition = '', sort = 'newest', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr))
  const take = 24
  const skip = (page - 1) * take

  const orderBy = sort === 'name_asc'
    ? { name: 'asc' as const }
    : sort === 'name_desc'
    ? { name: 'desc' as const }
    : { createdAt: 'desc' as const }

  const where = {
    status: 'ACTIVE' as const,
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(condition ? { condition: condition as ProductCondition } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [products, total, categories, brands, activeCategory] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true } },
        brand: { select: { name: true } },
        _count: { select: { auctions: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    categoryId ? prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }) : null,
  ])

  const totalPages = Math.ceil(total / take)

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ q, categoryId, brandId, condition, sort, page: pageStr, ...overrides })
    // Remove empty values
    ;['q', 'categoryId', 'brandId', 'condition'].forEach((k) => { if (!params.get(k)) params.delete(k) })
    if (params.get('sort') === 'newest') params.delete('sort')
    if (params.get('page') === '1') params.delete('page')
    const s = params.toString()
    return `/san-pham${s ? `?${s}` : ''}`
  }

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-red">Trang chủ</Link>
        <span>/</span>
        {activeCategory ? (
          <>
            <Link href="/san-pham" className="hover:text-brand-red">Sản phẩm</Link>
            <span>/</span>
            <span className="text-gray-700">{activeCategory.name}</span>
          </>
        ) : (
          <span className="text-gray-700">Sản phẩm</span>
        )}
      </nav>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          {/* Search */}
          <form method="GET" className="mb-5">
            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition focus-within:border-brand-red focus-within:ring-2 focus-within:ring-red-100">
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm sản phẩm..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
              />
              <button type="submit" className="flex items-center justify-center bg-brand-red px-3.5 text-white hover:bg-red-700 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Categories */}
          <div className="mb-1 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <span className="text-base">🗂️</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Danh Mục</h3>
            </div>
            <ul className="py-1.5">
              <li>
                <Link
                  href={buildUrl({ categoryId: '', page: '1' })}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all
                    ${!categoryId
                      ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                      : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <span className="flex-1">Tất cả danh mục</span>
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={buildUrl({ categoryId: cat.id, page: '1' })}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all
                      ${categoryId === cat.id
                        ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                        : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <span className="flex-1">{cat.name}</span>
                    {cat._count.products > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums
                        ${categoryId === cat.id ? 'bg-red-100 text-brand-red' : 'bg-gray-100 text-gray-400'}`}>
                        {cat._count.products}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Condition */}
          <div className="my-3 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <span className="text-base">✨</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Tình Trạng</h3>
            </div>
            <ul className="py-1.5">
              <li>
                <Link
                  href={buildUrl({ condition: '', page: '1' })}
                  className={`flex items-center px-4 py-2 text-sm transition-all
                    ${!condition
                      ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                      : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  Tất cả
                </Link>
              </li>
              {CONDITION_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <Link
                    href={buildUrl({ condition: opt.value, page: '1' })}
                    className={`flex items-center px-4 py-2 text-sm transition-all
                      ${condition === opt.value
                        ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                        : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {opt.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          {brands.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <span className="text-base">🏷️</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Thương Hiệu</h3>
              </div>
              <ul className="max-h-52 overflow-y-auto py-1.5 scrollbar-thin">
                <li>
                  <Link
                    href={buildUrl({ brandId: '', page: '1' })}
                    className={`flex items-center px-4 py-2 text-sm transition-all
                      ${!brandId
                        ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                        : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    Tất cả thương hiệu
                  </Link>
                </li>
                {brands.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={buildUrl({ brandId: b.id, page: '1' })}
                      className={`flex items-center px-4 py-2 text-sm transition-all
                        ${brandId === b.id
                          ? 'border-l-2 border-brand-red bg-red-50 font-semibold text-brand-red'
                          : 'border-l-2 border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {activeCategory?.name ?? (q ? `Kết quả cho "${q}"` : 'Tất Cả Sản Phẩm')}
              </h1>
              <p className="mt-0.5 text-sm text-gray-400">{total} sản phẩm</p>
            </div>
            <div className="flex items-center gap-2">
              {[q, categoryId, brandId, condition].some(Boolean) && (
                <Link href="/san-pham" className="text-xs text-gray-400 hover:text-brand-red underline">
                  Xoá bộ lọc
                </Link>
              )}
              <Suspense fallback={null}>
                <SortSelect value={sort} options={SORT_OPTIONS} />
              </Suspense>
            </div>
          </div>

          {/* Grid */}
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-700">Không tìm thấy sản phẩm</p>
              <p className="mt-1 text-sm text-gray-400">Thử tìm với từ khoá khác hoặc xoá bộ lọc</p>
              <Link href="/san-pham" className="mt-4 inline-block rounded-lg bg-brand-red px-6 py-2 text-sm font-medium text-white hover:bg-brand-red-dark">
                Xem tất cả
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="flex h-9 w-9 items-center justify-center rounded-full border text-sm text-gray-600 hover:bg-gray-50">
                  ←
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                return (
                  <Link
                    key={p}
                    href={buildUrl({ page: String(p) })}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${p === page ? 'bg-brand-red font-bold text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="flex h-9 w-9 items-center justify-center rounded-full border text-sm text-gray-600 hover:bg-gray-50">
                  →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
