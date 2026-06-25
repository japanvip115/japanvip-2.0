import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import type { BlogPostStatus } from '@japanvip/db'
import { Plus } from 'lucide-react'
import { BlogBulkImport } from '@/components/admin/blog-bulk-import'
import { BlogTable } from '@/components/admin/blog-table'

export const metadata: Metadata = { title: 'Admin — Blog' }
export const dynamic = 'force-dynamic'

const STATUS_TABS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đã xuất bản', value: 'PUBLISHED' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Lưu trữ', value: 'ARCHIVED' },
]

type SearchParams = Promise<{ status?: string; page?: string; q?: string }>

export default async function AdminBlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { status = 'ALL', page = '1', q = '' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const take = 20
  const skip = (pageNum - 1) * take

  const where = {
    ...(status !== 'ALL' ? { status: status as BlogPostStatus } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        author: { select: { email: true, profile: { select: { fullName: true } } } },
        category: { select: { name: true } },
      },
    }),
    prisma.blogPost.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams({ status, page, q, ...overrides })
    if (p.get('status') === 'ALL') p.delete('status')
    if (p.get('page') === '1') p.delete('page')
    if (!p.get('q')) p.delete('q')
    const s = p.toString()
    return `/admin/content/blog${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/admin/content" className="hover:text-gray-300 transition-colors">Nội Dung</Link>
            <span>/</span>
            <span>Blog</span>
          </div>
          <h1 className="text-xl font-bold text-white">Bài Viết Blog</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} bài viết</p>
        </div>
        <Link
          href="/admin/content/blog/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Viết Bài Mới
        </Link>
      </div>

      <BlogBulkImport />

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex rounded-lg border border-gray-700 overflow-hidden">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: '1' })}
              className={`px-3 py-1.5 text-sm transition-colors ${(status === tab.value || (tab.value === 'ALL' && !status)) ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <form method="GET" action="/admin/content/blog" className="ml-auto">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm bài viết..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
          />
        </form>
      </div>

      <BlogTable posts={posts} />

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
              className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${p === pageNum ? 'bg-red-600 text-white' : 'border border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
