import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BlogPostForm } from '@/components/admin/blog-post-form'

export const metadata: Metadata = { title: 'Admin — Viết Bài Mới' }

export default async function AdminBlogNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await prisma.blogCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <a href="/admin/content" className="hover:text-white">Nội Dung</a>
          <span>/</span>
          <a href="/admin/content/blog" className="hover:text-white">Blog</a>
          <span>/</span>
          <span>Bài mới</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Viết Bài Mới</h1>
      </div>
      <BlogPostForm mode="create" categories={categories} authorId={(session.user as any).id} />
    </div>
  )
}
