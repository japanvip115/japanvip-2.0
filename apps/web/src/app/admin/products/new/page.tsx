import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { ProductForm } from '@/components/admin/product-form'

export const metadata: Metadata = { title: 'Admin — Thêm Sản Phẩm' }

export default async function AdminProductNewPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Thêm Sản Phẩm Mới</h1>
        <p className="text-sm text-gray-400">Tạo sản phẩm để dùng trong đấu giá hoặc cửa hàng</p>
      </div>
      <ProductForm mode="create" />
    </div>
  )
}
