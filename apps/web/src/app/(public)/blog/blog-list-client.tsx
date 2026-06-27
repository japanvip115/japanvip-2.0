'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
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

const PAGE_SIZE = 12

// Lọc danh mục client-side (useSearchParams) → trang /blog render TĨNH.
export function BlogListClient({ posts, categories, products }: { posts: Post[]; categories: Category[]; products: Product[] }) {
  const cat = useSearchParams().get('cat') ?? ''
  const filtered = cat ? posts.filter((p) => p.category?.slug === cat) : posts

  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => { setVisible(PAGE_SIZE) }, [cat])
  const shown = filtered.slice(0, visible)

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* Posts grid */}
        <div>
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-gray-400">Chưa có bài viết nào.</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {shown.map((p) => (
                  <article key={p.slug} className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow duration-200 hover:shadow-md">
                    <Link href={`/blog/${p.slug}`} className="flex flex-1 flex-col">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                        {p.thumbnailUrl ? (
                          <Image src={p.thumbnailUrl} alt={p.title} fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(min-width:1024px) 420px, (min-width:640px) 45vw, 100vw" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">📰</div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          {p.category && <span className="flex items-center gap-1">📁 {p.category.name}</span>}
                          {p.publishedAt && <span className="flex items-center gap-1">📅 {new Date(p.publishedAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                        <h2 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-red">
                          {p.title}
                        </h2>
                        {p.excerpt && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">{p.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  </article>
                ))}
              </div>

              {visible < filtered.length && (
                <div className="mt-8 text-center">
                  <button onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-red hover:text-brand-red">
                    Xem thêm bài viết ({filtered.length - visible})
                  </button>
                </div>
              )}
            </>
          )}
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
