import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { BatchAuctionForm } from '@/components/auction/batch-auction-form'

export const metadata: Metadata = { title: 'Admin — Nhập Lô Đấu Giá' }

export default async function AdminAuctionsBatchPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
    take: 500,
  })

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/admin/auctions" className="hover:text-gray-300 transition-colors">Đấu giá</a>
          <span>›</span>
          <span className="text-gray-300">Nhập lô</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Nhập Lô Đấu Giá</h1>
        <p className="text-sm text-gray-500 mt-1">Tạo nhiều lot đấu giá cùng lúc từ 1 sản phẩm — mỗi lot là 1 đơn vị hàng thực tế</p>
      </div>
      <BatchAuctionForm products={products.map((p) => ({
        id: p.id,
        name: p.name,
        images: p.images,
        brand: p.brand?.name ?? '',
        category: p.category?.name ?? '',
      }))} />
    </div>
  )
}
