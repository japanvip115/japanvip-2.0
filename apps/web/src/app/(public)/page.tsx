import { prisma } from '@japanvip/db'
import dynamicImport from 'next/dynamic'
import { HOME_CONTENT_KEYS } from '@/lib/home-content-keys'

const HomePageClient = dynamicImport(() => import('@/components/home/home-page-client'))

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const now = new Date()
  const [categories, products, liveAuctions, contentRows, heroBanners] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: { select: { products: true } },
      },
    }),

    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        originPrice: true,
        salePrice: true,
        marketPrice: true,
        condition: true,
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    }),

    prisma.auction.findMany({
      where: { status: 'LIVE' },
      orderBy: { endsAt: 'asc' },
      take: 8,
      select: {
        id: true,
        auctionNumber: true,
        currentPrice: true,
        bidCount: true,
        endsAt: true,
        minIncrement: true,
        product: {
          select: {
            name: true,
            slug: true,
            brand: { select: { name: true } },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),

    prisma.siteSetting.findMany({ where: { key: { in: [...HOME_CONTENT_KEYS] } } }),

    prisma.banner.findMany({
      where: {
        position: 'home-hero',
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, imageUrl: true, linkUrl: true },
    }),
  ])

  const content: Record<string, string> = {}
  for (const row of contentRows) content[row.key] = row.value

  return (
    <HomePageClient
      categories={categories}
      products={products.map((p) => ({
        ...p,
        originPrice: p.originPrice ? Number(p.originPrice) : null,
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        marketPrice: p.marketPrice ? Number(p.marketPrice) : null,
      }))}
      auctions={liveAuctions.map((a) => ({
        ...a,
        currentPrice: Number(a.currentPrice),
        minIncrement: Number(a.minIncrement),
        endsAt: a.endsAt.toISOString(),
      }))}
      content={content}
      heroBanners={heroBanners}
    />
  )
}
