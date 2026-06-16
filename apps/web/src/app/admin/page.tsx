import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import Link from 'next/link'
import { ShoppingBag, Gavel, TrendingUp, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Tổng Quan' }
export const revalidate = 30

export default async function AdminDashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers,
    totalOrders,
    pendingOrders,
    liveAuctions,
    totalAuctions,
    recentOrders,
    recentAuctions,
    totalRevenue,
    bfjMonthStats,
  ] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.bfjOrder.count(),
    prisma.bfjOrder.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.auction.count({ where: { status: 'LIVE' } }),
    prisma.auction.count(),
    prisma.bfjOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.auction.findMany({
      where: { status: 'LIVE' },
      take: 5,
      include: { product: { select: { name: true } } },
    }),
    prisma.transaction
      .aggregate({ where: { direction: 'CREDIT', type: 'BFJ_PAYMENT' }, _sum: { amount: true } })
      .then((r) => Number(r._sum.amount ?? 0)),
    prisma.bfjOrder.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _count: { id: true },
      _sum: { estimatedVnd: true, profitVnd: true },
    }),
  ])

  const bfjMonthCount = bfjMonthStats._count.id
  const bfjMonthRevenue = Number(bfjMonthStats._sum.estimatedVnd ?? 0)
  const bfjMonthProfit = Number(bfjMonthStats._sum.profitVnd ?? 0)
  const bfjProfitRate = bfjMonthRevenue > 0 ? (bfjMonthProfit / bfjMonthRevenue) * 100 : 0

  const BFJ_STATUS_COLORS: Record<string, string> = {
    PENDING_REVIEW: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
    AWAITING_DEPOSIT: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
    CONFIRMED: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
    DELIVERED: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
    CANCELLED: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Tổng Quan Hệ Thống</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Người dùng', value: totalUsers.toLocaleString(), sub: 'đang hoạt động', href: '/admin/users', color: 'text-blue-400' },
          { label: 'Đơn Mua Hộ', value: totalOrders.toLocaleString(), sub: `${pendingOrders} cần xử lý`, href: '/admin/orders', color: 'text-yellow-400' },
          { label: 'Phiên đấu giá', value: totalAuctions.toLocaleString(), sub: `${liveAuctions} đang LIVE`, href: '/admin/auctions', color: 'text-green-400' },
          { label: 'Doanh thu Mua Hộ', value: formatVND(totalRevenue), sub: 'tổng cộng', href: '/admin/finance', color: 'text-red-400' },
        ].map(({ label, value, sub, href, color }) => (
          <Link key={href} href={href} className="block rounded-xl border border-gray-700 bg-gray-800/60 p-4 transition-colors hover:border-gray-600 hover:bg-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
          </Link>
        ))}
      </div>

      {/* BFJ Revenue stats */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-200">Doanh thu Mua Hộ — Tháng này</h2>
          <Link href="/admin/orders" className="text-xs text-red-400 hover:text-red-300">Xem đơn</Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-700 sm:grid-cols-4">
          {[
            { label: 'Số đơn', value: bfjMonthCount.toLocaleString(), sub: 'đơn trong tháng', color: 'text-blue-400' },
            { label: 'Doanh thu', value: formatVND(bfjMonthRevenue), sub: 'tổng ước tính', color: 'text-yellow-400' },
            { label: 'Lợi nhuận', value: formatVND(bfjMonthProfit), sub: 'phí + margin ship', color: 'text-green-400' },
            { label: 'Tỷ lệ LN', value: `${bfjProfitRate.toFixed(1)}%`, sub: 'lợi nhuận / doanh thu', color: bfjProfitRate >= 10 ? 'text-green-400' : 'text-yellow-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-gray-600">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '/admin/orders', icon: ShoppingBag, label: 'Đơn Mua Hộ cần duyệt', badge: pendingOrders > 0 ? pendingOrders : null },
          { href: '/admin/auctions/new', icon: Gavel, label: 'Tạo phiên đấu giá', badge: null },
          { href: '/admin/settings/bfj', icon: TrendingUp, label: 'Cài đặt Mua Hộ', badge: null },
          { href: '/admin/users', icon: Users, label: 'Quản lý người dùng', badge: null },
        ].map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </span>
            {badge != null && badge > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-200">Đơn Mua Hộ Gần Đây</h2>
            <Link href="/admin/orders" className="text-xs text-red-400 hover:text-red-300">Xem tất cả</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Chưa có đơn hàng</p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-700/30 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {o.customer.profile?.fullName ?? o.customer.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BFJ_STATUS_COLORS[o.status] ?? 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-bold text-gray-300">{formatVND(Number(o.estimatedVnd))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Live auctions */}
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-200">Phiên Đang LIVE</h2>
            <Link href="/admin/auctions?status=LIVE" className="text-xs text-red-400 hover:text-red-300">Xem tất cả</Link>
          </div>
          {recentAuctions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Không có phiên nào đang live</p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {recentAuctions.map((a) => (
                <Link key={a.id} href={`/admin/auctions/${a.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-700/30 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-sm font-medium text-gray-200 truncate">{a.product.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-red-400">{formatVND(Number(a.currentPrice))}</p>
                    <p className="text-xs text-gray-500">{a.bidCount} lượt</p>
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
