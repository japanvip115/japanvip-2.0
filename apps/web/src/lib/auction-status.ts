import type { AuctionStatus } from '@japanvip/db'

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  DRAFT: 'Bản nháp',
  SCHEDULED: 'Sắp diễn ra',
  LIVE: 'Đang đấu giá',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã huỷ',
  SETTLED: 'Đã thanh toán',
}

export const AUCTION_STATUS_COLORS: Record<AuctionStatus, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
  SCHEDULED: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  LIVE: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  ENDED: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  CANCELLED: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  SETTLED: 'bg-purple-500/15 text-purple-400 ring-1 ring-inset ring-purple-500/20',
}
