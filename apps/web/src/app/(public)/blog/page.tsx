import type { Metadata } from 'next'
import { Suspense } from 'react'
import { prisma } from '@japanvip/db'
import { BlogListClient } from './blog-list-client'

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

export default async function BlogPage() {
  const [categories, posts, randomProducts] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: 'asc' }, take: 8 }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true, title: true, publishedAt: true,
        thumbnailUrl: true, excerpt: true,
        category: { select: { name: true, slug: true } },
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

  const postsData = posts.map((p) => ({
    slug: p.slug, title: p.title,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    thumbnailUrl: p.thumbnailUrl, excerpt: p.excerpt,
    category: p.category,
  }))
  const categoriesData = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
  const shuffled = [...randomProducts].sort(() => Math.random() - 0.5).slice(0, 5)
  const productsData = shuffled.map((p) => ({
    id: p.id, name: p.name, slug: p.slug,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    marketPrice: p.marketPrice ? Number(p.marketPrice) : null,
    brand: p.brand,
    imageUrl: p.images[0]?.url ?? null,
  }))

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Blog Japan VIP</h1>
          <p className="mt-1 text-sm text-gray-500">Kinh nghiệm chọn mua, hướng dẫn sử dụng &amp; đánh giá hàng gia dụng nội địa Nhật Bản</p>
        </header>
        <Suspense fallback={<p className="py-20 text-center text-gray-400">Đang tải…</p>}>
          <BlogListClient posts={postsData} categories={categoriesData} products={productsData} />
        </Suspense>
      </div>
    </div>
  )
}
