import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { CreateAuctionForm } from '@/components/auction/create-auction-form'

export const metadata: Metadata = { title: 'Admin — Tạo Phiên Đấu Giá' }

export default async function AdminAuctionsNewPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
    orderBy: { name: 'asc' },
    take: 200,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tạo Phiên Đấu Giá Mới</h1>
        <p className="text-sm text-gray-500">Chọn sản phẩm và thiết lập thông số đấu giá</p>
      </div>
      <CreateAuctionForm products={products.map((p) => ({ id: p.id, name: p.name, sku: '', images: p.images }))} />
    </div>
  )
}
