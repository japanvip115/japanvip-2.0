import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Globe, Plus, Pencil } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — SEO Pages' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ q?: string }>

export default async function AdminSeoPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '' } = await searchParams

  const pages = await prisma.seoPage.findMany({
    where: q ? { pagePath: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { pagePath: 'asc' },
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/admin/content" className="hover:text-gray-300 transition-colors">Nội Dung</Link>
            <span>/</span>
            <span>SEO Pages</span>
          </div>
          <h1 className="text-xl font-bold text-white">SEO Pages</h1>
          <p className="mt-0.5 text-sm text-gray-500">{pages.length} trang đã cấu hình</p>
        </div>
        <Link
          href="/admin/content/seo/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Thêm Trang SEO
        </Link>
      </div>

      <div className="mb-4">
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo đường dẫn..."
            className="w-64 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Đường dẫn</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Meta Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Robots</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cập nhật</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  Chưa có cấu hình SEO nào.{' '}
                  <Link href="/admin/content/seo/new" className="text-red-400 hover:underline">
                    Thêm ngay
                  </Link>
                </td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs text-green-400">{p.pagePath}</td>
                <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                  {p.title ?? <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-400 border border-gray-600">
                    {p.robots}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/content/seo/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" /> Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
