import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@japanvip/db'

export const metadata: Metadata = { title: 'Bài Viết — Japan VIP' }
export const dynamic = 'force-dynamic'

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams

  const [categories, posts, randomProducts] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: 'asc' }, take: 8 }),
    prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        ...(cat ? { category: { slug: cat } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true, title: true, publishedAt: true,
        thumbnailUrl: true, excerpt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { profile: { select: { fullName: true } } } },
      },
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

  // Shuffle products for random display
  const shuffled = [...randomProducts].sort(() => Math.random() - 0.5).slice(0, 5)

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/blog" className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!cat ? 'bg-brand-red text-white' : 'border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
              Tất cả
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/blog?cat=${c.slug}`}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c.slug ? 'bg-brand-red text-white' : 'border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red'}`}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px] lg:gap-8">
          {/* Posts list */}
          <div className="divide-y divide-gray-100">
            {posts.length === 0 ? (
              <p className="py-20 text-center text-gray-400">Chưa có bài viết nào.</p>
            ) : posts.map((p) => (
              <article key={p.slug} className="py-7">
                {/* Title */}
                <Link href={`/blog/${p.slug}`}>
                  <h2 className="text-xl font-bold text-gray-900 hover:text-brand-red transition-colors leading-snug mb-2">
                    {p.title}
                  </h2>
                </Link>

                {/* Meta row */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {p.category && (
                    <Link href={`/blog?cat=${p.category.slug}`} className="flex items-center gap-1 hover:text-brand-red transition-colors">
                      <span>📁</span> {p.category.name}
                    </Link>
                  )}
                  {p.publishedAt && (
                    <span className="flex items-center gap-1">
                      <span>📅</span> {new Date(p.publishedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Image + Excerpt */}
                <div className="flex gap-5">
                  {p.thumbnailUrl && (
                    <Link href={`/blog/${p.slug}`} className="shrink-0">
                      <div className="relative h-28 w-36 overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={p.thumbnailUrl} alt={p.title} fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="144px"
                        />
                      </div>
                    </Link>
                  )}
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{p.excerpt}</p>
                    )}
                    <div className="mt-3">
                      <Link href={`/blog/${p.slug}`}
                        className="inline-block rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:border-brand-red hover:text-brand-red transition-colors">
                        Xem thêm
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-6 pt-1">
            {/* Category list */}
            {categories.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Danh mục</h3>
                <ul className="space-y-1.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/blog?cat=${c.slug}`}
                        className={`block text-sm py-0.5 transition-colors ${cat === c.slug ? 'text-brand-red font-semibold' : 'text-gray-600 hover:text-brand-red'}`}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent posts */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Bài viết mới</h3>
              <ul className="space-y-3">
                {posts.slice(0, 5).map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className="text-sm text-gray-600 hover:text-brand-red transition-colors line-clamp-2 leading-snug">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Random products */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Hàng Mới Về</h3>
              <div className="space-y-4">
                {shuffled.map((p) => {
                  const img = p.images[0]?.url
                  const price = p.salePrice ? Number(p.salePrice) : null
                  const market = p.marketPrice ? Number(p.marketPrice) : null
                  return (
                    <Link key={p.id} href={`/${p.slug}`} className="group block">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-2">
                        {img ? (
                          <Image src={img} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="300px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                        )}
                      </div>
                      {p.brand && <p className="text-xs text-gray-400 mb-0.5">{p.brand.name}</p>}
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-red transition-colors line-clamp-2 leading-snug">{p.name}</p>
                      {price ? (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
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
