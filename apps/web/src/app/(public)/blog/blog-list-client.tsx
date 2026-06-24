'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

type Post = {
  slug: string
  title: string
  publishedAt: string | null
  thumbnailUrl: string | null
  excerpt: string | null
  category: { name: string; slug: string } | null
}
type Category = { id: string; name: string; slug: string }
type Product = {
  id: string; name: string; slug: string
  salePrice: number | null; marketPrice: number | null
  brand: { name: string } | null
  imageUrl: string | null
}

// Lọc danh mục client-side (useSearchParams) → trang /blog render TĨNH.
export function BlogListClient({ posts, categories, products }: { posts: Post[]; categories: Category[]; products: Product[] }) {
  const cat = useSearchParams().get('cat') ?? ''
  const filtered = cat ? posts.filter((p) => p.category?.slug === cat) : posts

  return (
    <>
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
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-gray-400">Chưa có bài viết nào.</p>
          ) : filtered.map((p) => (
            <article key={p.slug} className="py-7">
              <Link href={`/blog/${p.slug}`}>
                <h2 className="text-xl font-bold text-gray-900 hover:text-brand-red transition-colors leading-snug mb-2">
                  {p.title}
                </h2>
              </Link>

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

              <div className="flex gap-5">
                {p.thumbnailUrl && (
                  <Link href={`/blog/${p.slug}`} className="shrink-0">
                    <div className="relative h-28 w-36 overflow-hidden rounded-lg bg-gray-100">
                      <Image src={p.thumbnailUrl} alt={p.title} fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="144px" />
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

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Hàng Mới Về</h3>
            <div className="space-y-4">
              {products.map((p) => (
                <Link key={p.id} href={`/${p.slug}`} className="group block">
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-2">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="300px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                    )}
                  </div>
                  {p.brand && <p className="text-xs text-gray-400 mb-0.5">{p.brand.name}</p>}
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-red transition-colors line-clamp-2 leading-snug">{p.name}</p>
                  {p.salePrice ? (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-brand-red">{p.salePrice.toLocaleString('vi-VN')}₫</span>
                      {p.marketPrice && p.marketPrice > p.salePrice && (
                        <span className="text-sm text-gray-400 line-through">{p.marketPrice.toLocaleString('vi-VN')}₫</span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-bold text-brand-red">Liên hệ</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
