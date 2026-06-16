import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'
import Link from 'next/link'
import type { AuctionStatus } from '@japanvip/db'
import { Plus, ImageOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Quản Lý Đấu Giá' }

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang chạy', value: 'LIVE' },
  { label: 'Chờ bắt đầu', value: 'SCHEDULED' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã kết thúc', value: 'ENDED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
]

type SearchParams = Promise<{ status?: string; page?: string; q?: string }>

export default async function AdminAuctionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status = 'ALL', page = '1', q = '' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const take = 20
  const skip = (pageNum - 1) * take

  const where = {
    ...(status !== 'ALL' ? { status: status as AuctionStatus } : {}),
    ...(q
      ? {
          OR: [
            { auctionNumber: { contains: q, mode: 'insensitive' as const } },
            { product: { name: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        product: {
          select: {
            name: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
        _count: { select: { bids: true } },
      },
    }),
    prisma.auction.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản Lý Đấu Giá</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} phiên tổng cộng</p>
        </div>
        <Link
          href="/admin/auctions/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tạo phiên mới
        </Link>
      </div>

      {/* Search + Status tabs */}
      <div className="mb-4 space-y-3">
        <form method="GET">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm mã phiên, tên sản phẩm..."
            className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
          />
        </form>

        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/auctions?status=${tab.value}&q=${q}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                status === tab.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mã phiên</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá KĐ</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá hiện tại</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Lượt đặt</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kết thúc</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {auctions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  Không có phiên nào
                </td>
              </tr>
            ) : (
              auctions.map((auction) => (
                <tr key={auction.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {auction.product.images[0] ? (
                        <img
                          src={auction.product.images[0].url}
                          alt=""
                          className="h-10 w-10 rounded-lg border border-gray-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/30 text-gray-500">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                      <span className="max-w-[200px] truncate text-sm font-medium text-gray-300">
                        {auction.product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {auction.auctionNumber}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">
                    {formatVND(Number(auction.startPrice))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-400">
                    {formatVND(Number(auction.currentPrice))}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">{auction._count.bids}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        AUCTION_STATUS_COLORS[auction.status as AuctionStatus]
                      }`}
                    >
                      {AUCTION_STATUS_LABELS[auction.status as AuctionStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(auction.endsAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/auctions/${auction.id}`}
                      className="whitespace-nowrap text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Trang {pageNum} / {totalPages}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={`/admin/auctions?status=${status}&q=${q}&page=${pageNum - 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
              >
                ← Trước
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`/admin/auctions?status=${status}&q=${q}&page=${pageNum + 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
              >
                Sau →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
