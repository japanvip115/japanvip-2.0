import { prisma } from '@japanvip/db'
import dynamicImport from 'next/dynamic'
import { HOME_CONTENT_KEYS } from '@/lib/home-content-keys'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

const HomePageClient = dynamicImport(() => import('@/components/home/home-page-client'))

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  const now = new Date()
  const productSelect = {
    id: true,
    name: true,
    slug: true,
    originPrice: true,
    salePrice: true,
    marketPrice: true,
    condition: true,
    badge: true,
    brand: { select: { name: true } },
    category: { select: { name: true, slug: true } },
    images: { where: { isPrimary: true }, take: 1, select: { url: true } },
  } as const

  const [categories, homeProducts, orderProducts, newArrivals, liveAuctions, contentRows, brands, testimonials, heroBanners] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, showOnHome: true, parentId: null },
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

    // Sản Phẩm Bán Chạy — tick showOnHome, không phải ORDER_ONLY
    prisma.product.findMany({
      where: { status: 'ACTIVE', showOnHome: true, OR: [{ badge: null }, { badge: { not: 'ORDER_ONLY' } }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: productSelect,
    }),

    // Hàng Order — hiện trong MixedSlider cạnh đấu giá
    prisma.product.findMany({
      where: { status: 'ACTIVE', badge: 'ORDER_ONLY' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: productSelect,
    }),

    // Hàng Mới Về — CHỈ sản phẩm admin tick nhãn "Mới Về" (badge NEW_ARRIVAL)
    // Lấy pool rộng rồi random ở dưới để trang luôn trông tươi mới
    prisma.product.findMany({
      where: { status: 'ACTIVE', badge: 'NEW_ARRIVAL' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: productSelect,
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

    prisma.brand.findMany({
      where: { isActive: true, logoUrl: { not: null }, AND: [{ logoUrl: { not: '' } }] },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, logoUrl: true },
    }),

    prisma.$queryRaw<Array<{ id: string; name: string; city: string; photoUrl: string | null; text: string; rating: number }>>`
      SELECT id, name, city, photo_url as "photoUrl", text, rating
      FROM testimonials WHERE is_active = true ORDER BY sort_order ASC, created_at ASC
    `,

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

  // Random hóa Hàng Mới Về — trang luôn trông có sản phẩm mới mỗi lần tải
  const newArrivalsShuffled = [...newArrivals].sort(() => Math.random() - 0.5).slice(0, 12)

  const mapProduct = (p: typeof homeProducts[0]) => ({
    ...p,
    originPrice: p.originPrice ? Number(p.originPrice) : null,
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    marketPrice: p.marketPrice ? Number(p.marketPrice) : null,
  })

  return (
    <HomePageClient
      categories={categories}
      products={homeProducts.map(mapProduct)}
      orderProducts={orderProducts.map(mapProduct)}
      newArrivals={newArrivalsShuffled.map(mapProduct)}
      auctions={liveAuctions.map((a) => ({
        ...a,
        currentPrice: Number(a.currentPrice),
        minIncrement: Number(a.minIncrement),
        endsAt: a.endsAt.toISOString(),
      }))}
      content={content}
      heroBanners={heroBanners}
      brands={brands as Array<{ id: string; name: string; slug: string; logoUrl: string }>}
      testimonials={testimonials}
      isAdmin={hasRole((session?.user as any)?.role, 'ADMIN')}
    />
  )
}
