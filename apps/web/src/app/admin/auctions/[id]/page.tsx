import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'
import { AdminAuctionActions } from '@/components/auction/admin-auction-actions'
import type { AuctionStatus } from '@japanvip/db'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ExternalLink } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const auction = await prisma.auction.findUnique({ where: { id }, select: { auctionNumber: true } })
  return { title: `Admin — Phiên ${auction?.auctionNumber ?? id}` }
}

export const dynamic = 'force-dynamic'

export default async function AdminAuctionDetailPage({ params }: Props) {
  const { id } = await params

  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      product: {
        include: {
          images: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          bidder: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      },
      settlement: true,
      winner: {
        select: {
          email: true,
          profile: { select: { fullName: true } },
        },
      },
      creator: {
        select: { email: true, profile: { select: { fullName: true } } },
      },
    },
  })

  if (!auction) notFound()

  const primaryImage = auction.product.images.find((i) => i.isPrimary) ?? auction.product.images[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Link href="/admin/auctions" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Danh sách
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="font-mono text-sm text-gray-500">{auction.auctionNumber}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-white">{auction.product.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                AUCTION_STATUS_COLORS[auction.status as AuctionStatus]
              }`}
            >
              {AUCTION_STATUS_LABELS[auction.status as AuctionStatus]}
            </span>
            {auction.product.brand && (
              <span className="text-sm text-gray-400">{auction.product.brand.name}</span>
            )}
          </div>
        </div>
        <Link
          href={`/dau-gia/${auction.id}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Xem trang công khai
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product overview */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Sản phẩm</h2>
            <div className="flex gap-4">
              {primaryImage && (
                <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-gray-700">
                  <Image src={primaryImage.url} alt={auction.product.name} fill className="object-contain" sizes="(max-width:768px) 100vw, 50vw" unoptimized={!primaryImage.url.includes('media.japanvip.vn')} />
                </div>
              )}
              <div className="min-w-0 space-y-1.5">
                <p className="font-medium text-gray-100">{auction.product.name}</p>
                <p className="text-sm text-gray-400">
                  Danh mục: {auction.product.category?.name ?? '—'}
                </p>
                <p className="text-sm text-gray-400">
                  Thương hiệu: {auction.product.brand?.name ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Unit condition */}
          {(auction.unitCondition || (auction as any).unitImages?.length > 0) && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
              <h2 className="mb-3 text-sm font-semibold text-yellow-300">Tình Trạng Đơn Vị Hàng</h2>
              {auction.unitCondition && (
                <p className="text-sm text-gray-200 mb-3">📋 {auction.unitCondition}</p>
              )}
              {(auction as any).unitImages?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {((auction as any).unitImages as string[]).map((url: string, i: number) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-700">
                      <img src={url} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Thông Số Đấu Giá</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Giá khởi điểm', value: formatVND(Number(auction.startPrice)) },
                { label: 'Giá hiện tại', value: formatVND(Number(auction.currentPrice)), bold: true, color: 'text-red-400' },
                { label: 'Bước đặt giá', value: formatVND(Number(auction.minIncrement)) },
                { label: 'Giá bảo lưu', value: auction.reservePrice ? formatVND(Number(auction.reservePrice)) : '—' },
                { label: 'Giá mua ngay', value: auction.buyNowPrice ? formatVND(Number(auction.buyNowPrice)) : '—' },
                { label: 'Số lượt đặt', value: String(auction.bidCount) },
              ].map(({ label, value, bold, color }) => (
                <div key={label} className="rounded-lg bg-gray-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className={`text-sm font-medium ${color ?? 'text-gray-200'} ${bold ? 'font-bold' : ''}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Thời Gian</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Bắt đầu', value: auction.startsAt.toLocaleString('vi-VN') },
                { label: 'Kết thúc gốc', value: auction.endsAt.toLocaleString('vi-VN') },
                { label: 'Kết thúc thực tế', value: (auction.extendedEnd ?? auction.endsAt).toLocaleString('vi-VN') },
                { label: 'Ngưỡng gia hạn', value: `Còn ${auction.extendTrigger} phút → thêm ${auction.extendMinutes} phút` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-gray-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement info */}
          {auction.settlement && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-5">
              <h2 className="mb-3 text-sm font-semibold text-green-400">Kết Quả Đấu Giá</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Người thắng:</span>
                  <span className="font-medium text-gray-200">
                    {auction.winner?.profile?.fullName ?? auction.winner?.email ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Giá thắng (hammer):</span>
                  <span className="font-bold text-green-400">{formatVND(Number(auction.settlement.hammerPrice))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tổng phải trả:</span>
                  <span className="font-bold text-gray-200">{formatVND(Number(auction.settlement.totalPayable))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trạng thái thanh toán:</span>
                  <span className="font-medium text-gray-300">{auction.settlement.status}</span>
                </div>
                {auction.settlement.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Thanh toán lúc:</span>
                    <span className="text-gray-300">
                      {new Date(auction.settlement.paidAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bid history */}
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
            <div className="border-b border-gray-700 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-200">Lịch Sử Đặt Giá ({auction.bidCount})</h2>
            </div>
            {auction.bids.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">Chưa có lượt đặt giá</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Người đặt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá đặt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {auction.bids.map((bid, i) => (
                    <tr key={bid.id} className={i === 0 ? 'bg-red-500/10' : 'hover:bg-gray-700/30 transition-colors'}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-200 text-xs">
                          {bid.bidder.profile?.fullName ?? bid.bidder.email}
                        </p>
                        <p className="text-xs text-gray-500">{bid.bidder.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-100">
                        {formatVND(Number(bid.amount))}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            bid.status === 'WINNING'
                              ? 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20'
                              : bid.status === 'ACTIVE'
                              ? 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20'
                              : 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20'
                          }`}
                        >
                          {bid.status === 'WINNING' ? 'Dẫn đầu' : bid.status === 'ACTIVE' ? 'Đang đấu' : 'Thua'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                        {new Date(bid.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right sidebar: Admin actions */}
        <div className="space-y-4">
          <AdminAuctionActions
            auctionId={auction.id}
            currentStatus={auction.status as AuctionStatus}
            createdBy={auction.creator?.profile?.fullName ?? auction.creator?.email ?? '—'}
            createdAt={auction.createdAt.toISOString()}
          />
        </div>
      </div>
    </div>
  )
}
