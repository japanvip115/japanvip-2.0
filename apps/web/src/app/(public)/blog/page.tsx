import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import Image from 'next/image'
import { User, FolderOpen, MessageSquare, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog Gia Dụng Nội Địa Nhật Bản — Kinh Nghiệm & Đánh Giá',
  description:
    'Cẩm nang chọn mua, hướng dẫn sử dụng, so sánh và đánh giá hàng gia dụng nội địa Nhật Bản: bếp từ, máy giặt, nồi cơm, máy lọc không khí… từ Japan VIP.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Japan VIP — Kinh Nghiệm & Đánh Giá Hàng Gia Dụng Nhật Bản',
    description: 'Cẩm nang chọn mua, hướng dẫn sử dụng và đánh giá hàng gia dụng nội địa Nhật Bản từ Japan VIP.',
    type: 'website',
  },
}
export const revalidate = 300

const PER_PAGE = 10

function pageHref(cat: string, page: number): string {
  const params = new URLSearchParams()
  if (cat) params.set('cat', cat)
  if (page > 1) params.set('page', String(page))
  const q = params.toString()
  return q ? `/blog?${q}` : '/blog'
}

// Danh sách số trang + dấu "…" (cửa sổ quanh trang hiện tại + trang đầu/cuối)
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) out.push('…')
  for (let i = left; i <= right; i++) out.push(i)
  if (right < total - 1) out.push('…')
  out.push(total)
  return out
}

type SP = { cat?: string; page?: string }

export default async function BlogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const cat = typeof sp.cat === 'string' ? sp.cat : ''
  const page = Math.max(1, Number(sp.page) || 1)

  const where = { status: 'PUBLISHED' as const, ...(cat ? { category: { slug: cat } } : {}) }

  const [categories, total, posts, recentPosts, randomProducts] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: 'asc' }, take: 8 }),
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        slug: true, title: true, publishedAt: true, thumbnailUrl: true, excerpt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { profile: { select: { fullName: true } } } },
      },
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { slug: true, title: true },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, name: true, slug: true, salePrice: true, marketPrice: true,
        brand: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const sidebarProducts = [...randomProducts].sort(() => Math.random() - 0.5).slice(0, 5)

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Blog Japan VIP</h1>
          <p className="mt-1 text-sm text-gray-500">Kinh nghiệm chọn mua, hướng dẫn sử dụng &amp; đánh giá hàng gia dụng nội địa Nhật Bản</p>
        </header>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/blog" className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!cat ? 'bg-brand-red text-white' : 'border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
              Tất cả
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={pageHref(c.slug, 1)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c.slug ? 'bg-brand-red text-white' : 'border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
          {/* Posts list */}
          <div>
            {posts.length === 0 ? (
              <p className="py-20 text-center text-gray-400">Chưa có bài viết nào.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {posts.map((p) => (
                  <article key={p.slug} className="py-7 first:pt-0">
                    <Link href={`/blog/${p.slug}`}>
                      <h2 className="mb-2 text-xl font-bold leading-snug text-gray-900 transition-colors hover:text-brand-red md:text-2xl">
                        {p.title}
                      </h2>
                    </Link>

                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Tác giả: {p.author?.profile?.fullName ?? 'Japan VIP'}</span>
                      {p.category && (
                        <Link href={pageHref(p.category.slug, 1)} className="flex items-center gap-1 transition-colors hover:text-brand-red">
                          <FolderOpen className="h-3.5 w-3.5" /> {p.category.name}
                        </Link>
                      )}
                      <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> 0 Bình luận</span>
                      {p.publishedAt && (
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(p.publishedAt).toLocaleDateString('vi-VN')}</span>
                      )}
                    </div>

                    <div className="flex gap-5">
                      {p.thumbnailUrl && (
                        <Link href={`/blog/${p.slug}`} className="shrink-0">
                          <div className="relative h-32 w-48 overflow-hidden rounded-lg bg-gray-100 sm:h-44 sm:w-64">
                            <Image src={p.thumbnailUrl} alt={p.title} fill className="object-cover transition-transform duration-300 hover:scale-105" sizes="(min-width:640px) 256px, 192px" />
                          </div>
                        </Link>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        {p.excerpt && (
                          <p className="text-sm leading-relaxed text-gray-600 line-clamp-3 sm:line-clamp-4">{p.excerpt}</p>
                        )}
                        <div className="mt-3">
                          <Link href={`/blog/${p.slug}`}
                            className="inline-block rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
                            Xem thêm
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-8 flex flex-wrap items-center gap-1.5" aria-label="Phân trang">
                {pageList(page, totalPages).map((pg, i) =>
                  pg === '…' ? (
                    <span key={`e${i}`} className="px-2 py-1.5 text-gray-400">…</span>
                  ) : (
                    <Link key={pg} href={pageHref(cat, pg)} aria-current={pg === page ? 'page' : undefined}
                      className={`min-w-[38px] rounded border px-3 py-1.5 text-center text-sm transition-colors ${pg === page ? 'border-brand-red bg-brand-red text-white' : 'border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
                      {pg}
                    </Link>
                  ),
                )}
                {page < totalPages && (
                  <Link href={pageHref(cat, page + 1)}
                    className="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
                    Next »
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden space-y-6 pt-1 lg:block">
            {categories.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Danh mục</h3>
                <ul className="space-y-1.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={pageHref(c.slug, 1)}
                        className={`block py-0.5 text-sm transition-colors ${cat === c.slug ? 'font-semibold text-brand-red' : 'text-gray-600 hover:text-brand-red'}`}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Bài viết mới</h3>
              <ul className="space-y-3">
                {recentPosts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className="line-clamp-2 text-sm leading-snug text-gray-600 transition-colors hover:text-brand-red">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Hàng Mới Về</h3>
              <div className="space-y-4">
                {sidebarProducts.map((p) => {
                  const img = p.images[0]?.url
                  const price = p.salePrice ? Number(p.salePrice) : null
                  const market = p.marketPrice ? Number(p.marketPrice) : null
                  return (
                    <Link key={p.id} href={`/${p.slug}`} className="group block">
                      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                        {img ? (
                          <Image src={img} alt={p.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="300px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">📦</div>
                        )}
                      </div>
                      {p.brand && <p className="mb-0.5 text-xs text-gray-400">{p.brand.name}</p>}
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 transition-colors group-hover:text-brand-red">{p.name}</p>
                      {price ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-brand-red">{price.toLocaleString('vi-VN')}₫</span>
                          {market && market > price && (
                            <span className="text-sm text-gray-400 line-through">{market.toLocaleString('vi-VN')}₫</span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-bold text-brand-red">Liên hệ</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
