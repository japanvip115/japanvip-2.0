import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { StudioClient } from './studio-client'

export const metadata: Metadata = { title: 'Content Studio — Japan VIP Admin' }

export default async function ContentStudioPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 300,
  })
  return <StudioClient products={products} />
}
