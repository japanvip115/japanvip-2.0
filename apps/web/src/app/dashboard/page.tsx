import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import { getWalletBalance } from '@/modules/payment/wallet.service'
import { getUnreadCount } from '@/modules/notification/notification.service'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard — Japan VIP' }

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [wallet, unread, orderCount, auctionCount, recentOrders, recentBids] = await Promise.all([
    getWalletBalance(userId),
    getUnreadCount(userId),
    prisma.bfjOrder.count({ where: { customerId: userId } }),
    prisma.bid.groupBy({ by: ['auctionId'], where: { bidderId: userId } }).then((r) => r.length),
    prisma.bfjOrder.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, orderNumber: true, status: true, estimatedVnd: true, createdAt: true },
    }),
    prisma.bid.findMany({
      where: { bidderId: userId },
      distinct: ['auctionId'],
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        auction: {
          select: {
            id: true,
            status: true,
            currentPrice: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const BFJ_STATUS_COLORS: Record<string, string> = {
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
    AWAITING_DEPOSIT: 'bg-orange-100 text-orange-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PURCHASING: 'bg-purple-100 text-purple-700',
    SHIPPING_JP: 'bg-indigo-100 text-indigo-700',
    CUSTOMS: 'bg-pink-100 text-pink-700',
    SHIPPING_VN: 'bg-cyan-100 text-cyan-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Xin chào, {session!.user!.name?.split(' ').pop() ?? 'bạn'} 👋
        </h1>
        <p className="text-sm text-gray-500">Chào mừng trở lại Japan VIP</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Số dư ví', value: formatVND(wallet.available), href: '/dashboard/wallet', color: 'text-brand-red' },
          { label: 'Đơn Mua Hộ', value: String(orderCount), href: '/dashboard/orders', color: 'text-gray-900' },
          { label: 'Đấu giá', value: String(auctionCount), href: '/dashboard/auctions', color: 'text-gray-900' },
          { label: 'Thông báo', value: unread > 0 ? `${unread} mới` : '0', href: '/dashboard/notifications', color: unread > 0 ? 'text-brand-red' : 'text-gray-900' },
        ].map(({ label, value, href, color }) => (
          <Link key={href} href={href} className="block rounded-xl border bg-white p-4 hover:shadow-sm transition">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/mua-ho"
          className="flex items-center gap-4 rounded-xl border-2 border-dashed border-red-200 p-5 hover:border-brand-red hover:bg-red-50 transition"
        >
          <span className="text-3xl">🛒</span>
          <div>
            <p className="font-bold text-gray-900">Đặt hàng từ Nhật</p>
            <p className="text-sm text-gray-500">Nhập URL sản phẩm Amazon JP, Rakuten...</p>
          </div>
        </Link>
        <Link
          href="/auctions"
          className="flex items-center gap-4 rounded-xl border-2 border-dashed border-orange-200 p-5 hover:border-orange-400 hover:bg-orange-50 transition"
        >
          <span className="text-3xl">🔨</span>
          <div>
            <p className="font-bold text-gray-900">Tham gia đấu giá</p>
            <p className="text-sm text-gray-500">Xem các phiên đấu giá đang diễn ra</p>
          </div>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-bold text-gray-800">Đơn hàng gần đây</h2>
            <Link href="/dashboard/orders" className="text-xs text-brand-red hover:underline">Xem tất cả</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Chưa có đơn hàng</p>
          ) : (
            <div className="divide-y">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BFJ_STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{formatVND(Number(o.estimatedVnd))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent auctions */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="font-bold text-gray-800">Đấu giá gần đây</h2>
            <Link href="/dashboard/auctions" className="text-xs text-brand-red hover:underline">Xem tất cả</Link>
          </div>
          {recentBids.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Chưa tham gia đấu giá</p>
          ) : (
            <div className="divide-y">
              {recentBids.map((bid) => (
                <Link key={bid.id} href={`/auctions/${bid.auction.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                    {bid.auction.product.name}
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-red">{formatVND(Number(bid.auction.currentPrice))}</p>
                    <p className="text-xs text-gray-400">{bid.auction.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
