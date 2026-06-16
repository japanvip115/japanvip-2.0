import { prisma } from '@japanvip/db'
import type { AuctionStatus, Prisma } from '@japanvip/db'
import { getCached, setCached, invalidateCache, CacheKey, CACHE_TTL } from '@/lib/redis'

export type AuctionState = {
  id: string
  currentPrice: number
  bidCount: number
  endsAt: string
  extendedEnd: string | null
  status: AuctionStatus
}

export type CreateAuctionInput = {
  productId: string
  type: 'JAPANVIP_OWNED' | 'PARTNER_CONSIGNMENT'
  partnerId?: string
  status?: AuctionStatus
  startPrice: number
  reservePrice?: number
  buyNowPrice?: number
  minIncrement?: number
  startsAt: Date
  endsAt: Date
  autoExtend?: boolean
  extendMinutes?: number
  extendTrigger?: number
  commissionRate?: number
  buyerPremium?: number
  createdBy: string
}

async function generateAuctionNumber(): Promise<string> {
  const count = await prisma.auction.count()
  const year = new Date().getFullYear()
  return `AUC-${year}-${String(count + 1).padStart(6, '0')}`
}

export async function createAuction(input: CreateAuctionInput) {
  const auctionNumber = await generateAuctionNumber()

  return prisma.auction.create({
    data: {
      auctionNumber,
      productId: input.productId,
      type: input.type,
      partnerId: input.partnerId ?? null,
      status: input.status ?? 'DRAFT',
      startPrice: input.startPrice,
      currentPrice: input.startPrice,
      reservePrice: input.reservePrice ?? null,
      buyNowPrice: input.buyNowPrice ?? null,
      minIncrement: input.minIncrement ?? 10000,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      autoExtend: input.autoExtend ?? true,
      extendMinutes: input.extendMinutes ?? 5,
      extendTrigger: input.extendTrigger ?? 3,
      commissionRate: input.commissionRate ?? 0.10,
      buyerPremium: input.buyerPremium ?? 0.03,
      createdBy: input.createdBy,
    },
    include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
  })
}

export async function getAuctionState(auctionId: string): Promise<AuctionState | null> {
  const cacheKey = CacheKey.auctionState(auctionId)
  const cached = await getCached<AuctionState>(cacheKey)
  if (cached) return cached

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, currentPrice: true, bidCount: true, endsAt: true, extendedEnd: true, status: true },
  })
  if (!auction) return null

  const state: AuctionState = {
    id: auction.id,
    currentPrice: Number(auction.currentPrice),
    bidCount: auction.bidCount,
    endsAt: auction.endsAt.toISOString(),
    extendedEnd: auction.extendedEnd?.toISOString() ?? null,
    status: auction.status,
  }
  await setCached(cacheKey, state, CACHE_TTL.AUCTION_STATE)
  return state
}

export async function invalidateAuctionCache(auctionId: string) {
  await invalidateCache(
    CacheKey.auctionState(auctionId),
    CacheKey.auctionBids(auctionId)
  )
}

export async function listPublicAuctions(params: {
  page?: number
  limit?: number
  status?: AuctionStatus
  categoryId?: string
}) {
  const { page = 1, limit = 12, status = 'LIVE', categoryId } = params
  const now = new Date()
  const categoryFilter = categoryId ? { product: { categoryId } } : {}

  // LIVE: only auctions that are actually still running (not yet expired)
  // ENDED: DB status ENDED/SETTLED + LIVE rows whose time has passed (pending lazy settlement)
  let where: Prisma.AuctionWhereInput
  if (status === 'LIVE') {
    where = {
      status: 'LIVE',
      OR: [
        { extendedEnd: null, endsAt: { gt: now } },
        { extendedEnd: { gt: now } },
      ],
      ...categoryFilter,
    }
  } else if (status === 'ENDED') {
    where = {
      OR: [
        { status: { in: ['ENDED', 'SETTLED'] } },
        { status: 'LIVE', extendedEnd: null, endsAt: { lte: now } },
        { status: 'LIVE', extendedEnd: { lte: now } },
      ],
      ...categoryFilter,
    }
  } else {
    where = { status, ...categoryFilter }
  }

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ])

  return { auctions, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAuctionDetail(auctionId: string) {
  return prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      product: {
        include: {
          images: true,
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true } },
          attributes: true,
        },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          bidder: {
            select: { id: true, profile: { select: { fullName: true } } },
          },
        },
      },
    },
  })
}

export async function updateAuctionStatus(
  auctionId: string,
  status: AuctionStatus,
  adminId: string
) {
  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: { status },
  })
  await invalidateAuctionCache(auctionId)
  return updated
}

export async function adminListAuctions(params: {
  page?: number
  limit?: number
  status?: AuctionStatus
}) {
  const { page = 1, limit = 20, status } = params
  const where = status ? { status } : {}

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: {
        product: {
          select: { name: true, images: { where: { isPrimary: true }, take: 1 } },
        },
        partner: { select: { email: true, profile: { select: { fullName: true } } } },
        winner: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auction.count({ where }),
  ])

  return { auctions, total, page, limit, totalPages: Math.ceil(total / limit) }
}
