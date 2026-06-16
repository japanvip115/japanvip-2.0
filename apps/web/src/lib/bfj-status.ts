import type { BfjOrderStatus } from '@japanvip/db'

export const BFJ_STATUS_LABELS: Record<BfjOrderStatus, string> = {
  PENDING_REVIEW: 'Chờ xem xét',
  AWAITING_DEPOSIT: 'Chờ đặt cọc',
  DEPOSIT_RECEIVED: 'Đã nhận cọc',
  ORDERING: 'Đang đặt hàng',
  ORDERED_FROM_JAPAN: 'Đã đặt tại Nhật',
  IN_TRANSIT_JP: 'Đang vận chuyển (Nhật)',
  CUSTOMS_CLEARANCE: 'Đang hải quan',
  IN_TRANSIT_VN: 'Đang vận chuyển (VN)',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã huỷ',
  REFUNDED: 'Đã hoàn tiền',
}

// For admin dark UI
export const BFJ_STATUS_COLORS: Record<BfjOrderStatus, string> = {
  PENDING_REVIEW: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
  AWAITING_DEPOSIT: 'bg-orange-500/20 text-orange-300 ring-1 ring-inset ring-orange-500/30',
  DEPOSIT_RECEIVED: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  ORDERING: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  ORDERED_FROM_JAPAN: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  IN_TRANSIT_JP: 'bg-purple-500/15 text-purple-400 ring-1 ring-inset ring-purple-500/20',
  CUSTOMS_CLEARANCE: 'bg-purple-500/15 text-purple-400 ring-1 ring-inset ring-purple-500/20',
  IN_TRANSIT_VN: 'bg-purple-500/15 text-purple-400 ring-1 ring-inset ring-purple-500/20',
  DELIVERED: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  CANCELLED: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  REFUNDED: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
}

// For public light UI (white background)
export const BFJ_STATUS_COLORS_LIGHT: Record<BfjOrderStatus, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  AWAITING_DEPOSIT: 'bg-orange-100 text-orange-700 border border-orange-300',
  DEPOSIT_RECEIVED: 'bg-blue-100 text-blue-700 border border-blue-300',
  ORDERING: 'bg-blue-100 text-blue-700 border border-blue-300',
  ORDERED_FROM_JAPAN: 'bg-blue-100 text-blue-700 border border-blue-300',
  IN_TRANSIT_JP: 'bg-purple-100 text-purple-700 border border-purple-300',
  CUSTOMS_CLEARANCE: 'bg-purple-100 text-purple-700 border border-purple-300',
  IN_TRANSIT_VN: 'bg-purple-100 text-purple-700 border border-purple-300',
  DELIVERED: 'bg-green-100 text-green-700 border border-green-300',
  CANCELLED: 'bg-red-100 text-red-700 border border-red-300',
  REFUNDED: 'bg-gray-100 text-gray-600 border border-gray-300',
}

export const BFJ_STATUS_PROGRESS: Record<BfjOrderStatus, number> = {
  PENDING_REVIEW: 5,
  AWAITING_DEPOSIT: 15,
  DEPOSIT_RECEIVED: 25,
  ORDERING: 35,
  ORDERED_FROM_JAPAN: 50,
  IN_TRANSIT_JP: 65,
  CUSTOMS_CLEARANCE: 75,
  IN_TRANSIT_VN: 85,
  DELIVERED: 100,
  CANCELLED: 0,
  REFUNDED: 0,
}
