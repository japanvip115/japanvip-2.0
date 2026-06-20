import type { Metadata } from 'next'
import { AiWriterClient } from './ai-writer-client'
import { prisma } from '@japanvip/db'

export const metadata: Metadata = { title: 'AI Content Writer — Japan VIP Admin' }

export default async function AiWriterPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
    take: 200,
  })
  return <AiWriterClient products={products} />
}
