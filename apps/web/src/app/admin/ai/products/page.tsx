import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { ProductAiClient } from './products-client'

export const metadata: Metadata = { title: 'Phân tích sản phẩm AI — Japan VIP Admin' }

export default async function ProductAiPage() {
  const [products, profiles] = await Promise.all([
    prisma.product.findMany({
      where: { status: { in: ['DRAFT', 'ACTIVE'] } },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    }),
    prisma.productKnowledgeProfile.findMany({
      select: { productId: true, confidenceScore: true },
    }),
  ])
  return <ProductAiClient products={products} profiles={profiles} />
}
