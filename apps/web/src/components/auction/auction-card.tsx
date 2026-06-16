import Link from 'next/link'
import Image from 'next/image'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_COLORS, AUCTION_STATUS_LABELS } from '@/lib/auction-status'
import type { Auction, Product, ProductImage, AuctionStatus } from '@japanvip/db'

type AuctionWithProduct = Auction & {
  product: Product & {
    images: ProductImage[]
    category: { name: string } | null
    brand: { name: string } | null
  }
}

export function AuctionCard({ auction }: { auction: AuctionWithProduct }) {
  const image = auction.product.images[0]
  const effectiveEnd = auction.extendedEnd ?? auction.endsAt
  const isExpired = auction.status === 'LIVE' && new Date(effectiveEnd) <= new Date()
  const isLive = auction.status === 'LIVE' && !isExpired
  const displayStatus: AuctionStatus = isExpired ? 'ENDED' : auction.status as AuctionStatus

  return (
    <Link href={`/dau-gia/${auction.id}`} className="group block">
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {image ? (
            <Image
              src={image.url}
              alt={auction.product.name}
              fill
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 text-4xl">📦</div>
          )}
          {/* Live badge */}
          {isLive && (
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          )}
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              AUCTION_STATUS_COLORS[displayStatus]
            }`}
          >
            {isExpired ? 'Đã kết thúc' : AUCTION_STATUS_LABELS[displayStatus]}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          {auction.product.brand && (
            <p className="text-xs font-medium text-gray-400">{auction.product.brand.name}</p>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">
            {auction.product.name}
          </h3>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">Giá hiện tại</p>
              <p className="text-lg font-bold text-brand-red">
                {formatVND(Number(auction.currentPrice))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{auction.bidCount} lượt đặt</p>
              {isLive && (
                <AuctionCountdownMini endsAt={new Date(effectiveEnd).toISOString()} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Client-side countdown for the listing card
function AuctionCountdownMini({ endsAt }: { endsAt: string }) {
  // Server renders static time, client hydrates with countdown
  const end = new Date(endsAt)
  const diff = end.getTime() - Date.now()
  if (diff <= 0) return <p className="text-xs font-medium text-red-500">Đã kết thúc</p>

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (hours > 0) {
    return <p className="text-xs font-medium text-orange-500">{hours}h {minutes}m còn lại</p>
  }
  return <p className="text-xs font-bold text-red-600">{minutes}:{String(seconds).padStart(2, '0')} còn lại</p>
}
