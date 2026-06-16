import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { BlogPostForm } from '@/components/admin/blog-post-form'

export const metadata: Metadata = { title: 'Admin — Sửa Bài Viết' }

export default async function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [post, categories] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id } }),
    prisma.blogCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!post) notFound()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <a href="/admin/content" className="hover:text-white">Nội Dung</a>
          <span>/</span>
          <a href="/admin/content/blog" className="hover:text-white">Blog</a>
          <span>/</span>
          <span>Sửa bài</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sửa Bài Viết</h1>
      </div>
      <BlogPostForm mode="edit" categories={categories} authorId={post.authorId} initial={post} />
    </div>
  )
}
