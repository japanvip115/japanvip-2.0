import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { FactsClient } from './facts-client'

export const metadata: Metadata = { title: 'Dữ kiện tri thức — Japan VIP Admin' }

export default async function FactsPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 300,
  })
  return <FactsClient products={products} />
}
