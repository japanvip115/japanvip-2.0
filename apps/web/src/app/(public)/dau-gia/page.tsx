import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { listPublicAuctions } from '@/modules/auction/services/auction.service'
import { AuctionCard } from '@/components/auction/auction-card'
import Link from 'next/link'
import type { AuctionStatus } from '@japanvip/db'

// Cache nhẹ theo (status, page) — TTL ngắn 15s vì đấu giá là dữ liệu LIVE.
// Trang chi tiết mới là nơi đặt giá realtime; trang list chấp nhận trễ ~15s.
const getAuctionList = unstable_cache(
  async (status: AuctionStatus, page: number) => listPublicAuctions({ page, limit: 12, status }),
  ['dau-gia-list-v1'],
  { revalidate: 15, tags: ['auctions'] }
)

export const metadata: Metadata = {
  title: 'Đấu Giá Hàng Nhật — Japan VIP',
  description: 'Đấu giá hàng gia dụng nội địa Nhật Bản chính hãng. Giá khởi điểm thấp, minh bạch, an toàn.',
}

export const revalidate = 30 // ISR — revalidate every 30s

type Props = { searchParams: Promise<{ status?: string; page?: string }> }

const STATUS_TABS: { label: string; value: AuctionStatus }[] = [
  { label: 'Đang diễn ra', value: 'LIVE' },
  { label: 'Sắp diễn ra', value: 'SCHEDULED' },
  { label: 'Đã kết thúc', value: 'ENDED' },
]

export default async function AuctionsPage({ searchParams }: Props) {
  const { status: statusParam, page: pageParam } = await searchParams
  const status: AuctionStatus = (statusParam as AuctionStatus) ?? 'LIVE'
  const page = Math.max(1, parseInt(pageParam ?? '1'))

  const { auctions, total, totalPages } = await getAuctionList(status, page)

  return (
    <div className="container pb-6">
      <div className="mb-5 mt-10">
        <h1 className="text-xl font-bold text-gray-900">Đấu Giá Hàng Nhật</h1>
        <p className="mt-1 text-sm text-gray-500">{total} phiên đấu giá</p>
      </div>

      {/* Status tabs */}
      <div className="mb-8 flex gap-2 border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dau-gia?status=${tab.value}`}
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'border-b-2 border-brand-red text-brand-red'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {auctions.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          Không có phiên đấu giá nào trong trạng thái này
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dau-gia?status=${status}&page=${p}`}
              className={`h-9 w-9 rounded-full text-sm flex items-center justify-center ${
                p === page
                  ? 'bg-brand-red text-white'
                  : 'border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
