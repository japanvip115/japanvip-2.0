import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'
import { getWalletBalance } from '@/modules/payment/wallet.service'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = { title: 'Đấu Giá Của Tôi' }
export const dynamic = 'force-dynamic'

export default async function DashboardAuctionsPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [bids, liveAuctions, wallet] = await Promise.all([
    // Auctions user has bid on
    prisma.bid.findMany({
      where: { bidderId: userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['auctionId'],
      include: {
        auction: {
          include: {
            product: {
              select: { name: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
            },
          },
        },
      },
    }),
    // Live auctions not yet bid on (only ones with future endsAt)
    prisma.auction.findMany({
      where: {
        status: 'LIVE',
        endsAt: { gt: new Date() },
        bids: { none: { bidderId: userId } },
      },
      take: 6,
      orderBy: { endsAt: 'asc' },
      include: {
        product: {
          select: { name: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
        },
      },
    }),
    getWalletBalance(userId),
  ])

  const auctionIds = bids.map((b) => b.auctionId)
  const winningBids = await prisma.bid.findMany({
    where: { auctionId: { in: auctionIds }, bidderId: userId, status: 'WINNING' },
    select: { auctionId: true },
  })
  const winningSet = new Set(winningBids.map((b) => b.auctionId))

  const hasBalance = wallet.available > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đấu Giá Của Tôi</h1>
        <p className="text-sm text-gray-500">{bids.length} phiên đã tham gia</p>
      </div>

      {/* Wallet status + deposit flow guide */}
      <div className={`rounded-xl border-2 p-5 ${hasBalance ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`font-semibold ${hasBalance ? 'text-green-800' : 'text-orange-800'}`}>
              {hasBalance ? '✅ Quý khách đã sẵn sàng tham gia đấu giá' : '📋 Quý khách vui lòng đặt cọc để tham gia đấu giá'}
            </p>
            <p className={`mt-0.5 text-sm ${hasBalance ? 'text-green-700' : 'text-orange-700'}`}>
              {hasBalance
                ? <span>Số dư khả dụng: <span className="font-bold">{formatVND(wallet.available)}</span>{wallet.lockedBalance > 0 && <span className="ml-2 text-xs opacity-75">(đang tạm giữ: {formatVND(wallet.lockedBalance)})</span>}</span>
                : 'Tiền đặt cọc sẽ được hoàn lại sau khi kết thúc phiên đấu giá.'
              }
            </p>
          </div>
          <Link
            href={hasBalance ? '/dashboard/deposit' : '/dashboard/deposit'}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              hasBalance
                ? 'border border-green-300 text-green-700 hover:bg-green-100'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {hasBalance ? 'Xem đặt cọc' : 'Đặt cọc tham gia'}
          </Link>
        </div>

        {!hasBalance && (
          <div className="mt-4 rounded-lg bg-white border border-orange-100 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-orange-600">Quy trình đặt cọc tham gia đấu giá</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
              {[
                { step: '1', title: 'Chuyển khoản đặt cọc', desc: 'Theo thông tin tài khoản bên dưới' },
                { step: '2', title: 'Japan VIP xác nhận', desc: 'Trong vòng 1–2 giờ làm việc' },
                { step: '3', title: 'Tự do tham gia đặt giá', desc: 'Cọc được hoàn sau phiên' },
              ].map(({ step, title, desc }, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  {i > 0 && <div className="hidden sm:block h-px flex-1 bg-orange-200" />}
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
              STK: <span className="font-mono font-bold">1234 5678 9012</span> — MB Bank — Japan VIP ·
              Nội dung: <span className="font-mono font-bold">NapVi {userId.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* My bids */}
      {bids.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-bold text-gray-800">Phiên đã tham gia</h2>
          <div className="space-y-3">
            {bids.map((bid) => {
              const auction = bid.auction
              const isWinning = winningSet.has(auction.id)
              const isWon = auction.status === 'ENDED' && auction.winnerId === userId
              const img = auction.product.images[0]?.url
              const effectiveEnded = auction.status === 'LIVE' && new Date(auction.endsAt) < new Date()
              const displayStatus = effectiveEnded ? 'Đã kết thúc' : AUCTION_STATUS_LABELS[auction.status]
              const displayColor = effectiveEnded ? 'bg-gray-100 text-gray-500' : AUCTION_STATUS_COLORS[auction.status]

              return (
                <Link
                  key={bid.id}
                  href={`/dau-gia/${auction.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-white p-4 transition hover:shadow-md"
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                    {img
                      ? <Image src={img} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" unoptimized={!img.includes('media.japanvip.vn')} />
                      : <div className="flex h-full items-center justify-center text-2xl">📦</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-900">{auction.product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${displayColor}`}>
                        {displayStatus}
                      </span>
                      {isWinning && auction.status === 'LIVE' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">★ Đang dẫn đầu</span>
                      )}
                      {isWon && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">🏆 Đã thắng</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand-red">{formatVND(Number(auction.currentPrice))}</p>
                    <p className="text-xs text-gray-400">Giá hiện tại</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Live auctions to join */}
      {liveAuctions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Phiên đang diễn ra</h2>
            <Link href="/dau-gia" className="text-sm text-brand-red hover:underline">Xem tất cả →</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {liveAuctions.map((auction) => {
              const img = auction.product.images[0]?.url
              return (
                <Link
                  key={auction.id}
                  href={`/dau-gia/${auction.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-white p-4 transition hover:shadow-md"
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                    {img
                      ? <Image src={img} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" unoptimized={!img.includes('media.japanvip.vn')} />
                      : <div className="flex h-full items-center justify-center text-xl">📦</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{auction.product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Giá: <span className="font-semibold text-brand-red">{formatVND(Number(auction.currentPrice))}</span>
                      · {auction.bidCount} lượt
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                    LIVE
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {bids.length === 0 && liveAuctions.length === 0 && (
        <div className="rounded-xl border-2 border-dashed py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🔨</p>
          <p className="font-medium">Chưa có phiên đấu giá nào đang diễn ra</p>
          <Link href="/dau-gia" className="mt-3 inline-block text-sm text-brand-red underline">
            Xem lịch đấu giá
          </Link>
        </div>
      )}
    </div>
  )
}
