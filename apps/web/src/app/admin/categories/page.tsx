import type { Metadata } from 'next'
import { Fragment } from 'react'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Plus, FolderOpen, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Danh Mục' }
export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: { _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Danh Mục Sản Phẩm</h1>
          <p className="mt-0.5 text-sm text-gray-500">{categories.length} danh mục cấp 1</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Thêm Danh Mục
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Thứ tự</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Chưa có danh mục nào.{' '}
                  <Link href="/admin/categories/new" className="text-red-400 hover:underline">
                    Tạo ngay
                  </Link>
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <Fragment key={cat.id}>
                <tr className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-white">
                    <span className="mr-2 inline-flex text-gray-400"><FolderOpen className="h-4 w-4" /></span>
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">{cat._count.products}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-400">{cat.sortOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cat.isActive ? 'bg-green-500/15 text-green-400 ring-green-500/20' : 'bg-gray-500/15 text-gray-400 ring-gray-500/20'}`}>
                      {cat.isActive ? 'Hiện' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/categories/${cat.id}`}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
                {cat.children.map((child) => (
                  <tr key={child.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                    <td className="px-4 py-2.5 text-sm text-gray-300">
                      <span className="mr-2 ml-4 text-gray-600">
                        <ChevronRight className="inline h-3 w-3" />
                      </span>
                      <span className="mr-2 inline-flex text-gray-500"><FolderOpen className="inline h-3.5 w-3.5" /></span>
                      {child.name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{child.slug}</td>
                    <td className="px-4 py-2.5 text-center text-sm text-gray-400">{child._count.products}</td>
                    <td className="px-4 py-2.5 text-center text-sm text-gray-500">{child.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${child.isActive ? 'bg-green-500/15 text-green-400 ring-green-500/20' : 'bg-gray-500/15 text-gray-400 ring-gray-500/20'}`}>
                        {child.isActive ? 'Hiện' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/admin/categories/${child.id}`}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
