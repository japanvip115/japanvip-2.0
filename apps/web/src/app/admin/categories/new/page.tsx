import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { CategoryForm } from '@/components/admin/category-form'

export const metadata: Metadata = { title: 'Admin — Thêm Danh Mục' }

export default async function AdminCategoryNewPage() {
  const parents = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Thêm Danh Mục Mới</h1>
        <p className="text-sm text-gray-400">Tạo danh mục để phân loại sản phẩm</p>
      </div>
      <CategoryForm mode="create" parents={parents} />
    </div>
  )
}
