import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { CategoriesTable } from '@/components/admin/categories-table'

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

      <CategoriesTable categories={categories} />
    </div>
  )
}
