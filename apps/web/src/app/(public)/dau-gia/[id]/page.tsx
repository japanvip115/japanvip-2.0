import { getAuctionDetail } from '@/modules/auction/services/auction.service'
import { endAuction } from '@/modules/auction/services/bid.service'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { AuctionDetailClient } from '@/components/auction/auction-detail-client'
import { AuctionReviews } from '@/components/auction/auction-reviews'
import { ProductGallery } from '@/components/auction/product-gallery'
import { ProductTabs } from '@/components/auction/product-tabs'
import Image from 'next/image'
import type { Metadata } from 'next'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'
import type { AuctionStatus } from '@japanvip/db'

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Mới 100%',
  LIKE_NEW: 'Như mới',
  GOOD: 'Tốt',
  FAIR: 'Trung bình',
}
const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-green-100 text-green-700',
  LIKE_NEW: 'bg-teal-100 text-teal-700',
  GOOD: 'bg-blue-100 text-blue-700',
  FAIR: 'bg-yellow-100 text-yellow-700',
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const auction = await getAuctionDetail(id)
  if (!auction) return { title: 'Phiên đấu giá' }
  return {
    title: `${auction.product.name} — Đấu Giá Japan VIP`,
    description: `Đấu giá: ${auction.product.name}. Giá hiện tại: ${formatVND(Number(auction.currentPrice))}`,
    openGraph: {
      title: auction.product.name,
      description: `Giá hiện tại: ${formatVND(Number(auction.currentPrice))}`,
      images: auction.product.images[0] ? [auction.product.images[0].url] : [],
    },
  }
}

export const revalidate = 5

export default async function AuctionDetailPage({ params }: Props) {
  const { id } = await params
  const [auction, session, feeRateRow, shippingRow, auctionReviews] = await Promise.all([
    getAuctionDetail(id),
    auth(),
    prisma.siteSetting.findUnique({ where: { key: 'auction_fee_rate' } }),
    prisma.siteSetting.findUnique({ where: { key: 'auction_shipping_fee' } }),
    prisma.$queryRaw<Array<{ id: string; name: string; city: string; photoUrl: string | null; text: string; rating: number }>>`
      SELECT id, name, city, photo_url as "photoUrl", text, rating
      FROM testimonials WHERE is_active = true AND type = 'AUCTION' ORDER BY sort_order ASC, created_at ASC
    `,
  ])
  if (!auction) notFound()

  const images = auction.product.images
  const primaryImage = images.find((i) => i.isPrimary) ?? images[0]

  const plainDescription = auction.product.description ?? null

  // Lazy settlement: if LIVE but past end time, trigger endAuction() in background
  if (auction.status === 'LIVE') {
    const effectiveEnd = auction.extendedEnd ?? auction.endsAt
    if (new Date(effectiveEnd) < new Date()) {
      endAuction(auction.id).catch(() => {})
    }
  }

  const effectiveExpired = auction.status === 'LIVE' && new Date(auction.endsAt) < new Date()
  const displayStatus = effectiveExpired ? 'ENDED' : auction.status as AuctionStatus
  const displayLabel = effectiveExpired ? 'Đã kết thúc' : AUCTION_STATUS_LABELS[auction.status as AuctionStatus]
  const displayColor = effectiveExpired ? 'bg-gray-100 text-gray-500' : AUCTION_STATUS_COLORS[displayStatus]

  return (
    <div className="container pt-6 pb-8 md:pt-8 md:pb-12">

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Product info */}
        <div className="space-y-4">
          {/* Gallery */}
          <ProductGallery
            images={images.map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary ?? false }))}
            productName={auction.product.name}
          />

          {/* Brand + badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {auction.product.brand && (
              <span className="text-xs font-bold uppercase tracking-widest text-brand-red border border-red-200 rounded-md px-2 py-0.5">
                {auction.product.brand.name}
              </span>
            )}
            {auction.product.category && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
                {auction.product.category.name}
              </span>
            )}
            <span className={`text-xs font-semibold rounded-md px-2 py-0.5 ${CONDITION_COLORS[auction.product.condition] ?? 'bg-gray-100 text-gray-600'}`}>
              {CONDITION_LABELS[auction.product.condition] ?? auction.product.condition}
            </span>
            {auction.product.badge && (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-md px-2 py-0.5">
                {auction.product.badge}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug md:text-2xl truncate" title={auction.product.name}>{auction.product.name}</h1>

          {/* Market price reference */}
          {auction.product.marketPrice && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs text-gray-500">Giá thị trường tham khảo:</span>
              <span className="text-sm font-bold text-gray-700">{formatVND(Number(auction.product.marketPrice))}</span>
            </div>
          )}

          {/* Description + Specs tabs */}
          <ProductTabs
            description={plainDescription}
            attributes={auction.product.attributes}
          />
        </div>

        {/* Right: Bidding */}
        <div>
          <AuctionDetailClient
            auctionId={auction.id}
            auctionNumber={auction.auctionNumber}
            initialStatus={auction.status}
            initialCurrentPrice={Number(auction.currentPrice)}
            initialBidCount={auction.bidCount}
            initialEndsAt={auction.endsAt.toISOString()}
            initialExtendedEnd={auction.extendedEnd?.toISOString() ?? null}
            startPrice={Number(auction.startPrice)}
            minIncrement={Number(auction.minIncrement)}
            buyNowPrice={auction.buyNowPrice ? Number(auction.buyNowPrice) : null}
            reserveMet={!auction.reservePrice || Number(auction.currentPrice) >= Number(auction.reservePrice)}
            initialBids={auction.bids.map((b) => ({
              id: b.id,
              amount: Number(b.amount),
              bidderId: b.bidderId,
              bidderName: b.bidder.profile?.fullName ?? 'Ẩn danh',
              createdAt: b.createdAt.toISOString(),
              isAutoBid: b.isAutoBid,
            }))}
            winnerId={auction.winnerId}
            userId={session?.user?.id ?? null}
            isLoggedIn={!!session}
            auctionFeeRate={parseFloat(feeRateRow?.value ?? '2')}
            shippingFee={parseInt(shippingRow?.value ?? '150000', 10)}
          />
        </div>
      </div>

      {/* Đánh giá từ khách đã đấu giá */}
      <AuctionReviews data={auctionReviews} />
    </div>
  )
}
