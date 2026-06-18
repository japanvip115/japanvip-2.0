import type { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return apiSuccess({ products: [], categories: [] })

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        salePrice: true,
        originPrice: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 3,
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    }),
  ])

  return apiSuccess({
    products: products.map((p) => ({
      ...p,
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      originPrice: p.originPrice ? Number(p.originPrice) : null,
    })),
    categories,
  })
}
