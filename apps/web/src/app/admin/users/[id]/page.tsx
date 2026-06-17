import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { UserActions } from '@/components/admin/user-actions'
import { DepositActions } from '@/app/admin/finance/deposit-actions'
import { ResetPasswordButton } from '@/components/admin/reset-password-button'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { UserRole, UserStatus } from '@japanvip/db'

type Props = { params: Promise<{ id: string }> }

const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  SUSPENDED: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  PENDING_VERIFY: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  SUSPENDED: 'Đình chỉ',
  PENDING_VERIFY: 'Chờ xác minh',
}

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng',
  PARTNER: 'Đối tác',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
}

const BID_STATUS_COLORS: Record<string, string> = {
  WINNING: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  ACTIVE: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
  OUTBID: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, profile: { select: { fullName: true } } },
  })
  return { title: `Admin — ${user?.profile?.fullName ?? user?.email ?? 'Người dùng'}` }
}

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      wallet: { select: { balance: true, lockedBalance: true, currency: true } },
      transactions: {
        where: { type: 'DEPOSIT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, txnNumber: true, amount: true, paymentRef: true, status: true, notes: true, createdAt: true },
      },
      bfjOrders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, status: true, estimatedVnd: true, createdAt: true },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          auction: { select: { id: true, auctionNumber: true } },
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, resourceType: true, ipAddress: true, createdAt: true },
      },
      _count: { select: { bfjOrders: true, bids: true, notifications: true } },
    },
  })

  if (!user) notFound()

  const walletAvailable = user.wallet
    ? Number(user.wallet.balance) - Number(user.wallet.lockedBalance)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link href="/admin/users" className="text-sm text-gray-400 hover:text-gray-200">← Người dùng</Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-gray-400 truncate max-w-xs">
              {user.profile?.fullName ?? user.email}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">{user.profile?.fullName ?? '—'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
        </div>
        <UserActions
          userId={user.id}
          currentRole={user.role as UserRole}
          currentStatus={user.status as UserStatus}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent BFJ Orders */}
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-200">Đơn mua hộ ({user._count.bfjOrders})</h2>
              <Link href={`/admin/orders?userId=${user.id}`} className="text-xs text-red-400 hover:underline">
                Xem tất cả
              </Link>
            </div>
            {user.bfjOrders.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Chưa có đơn nào</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mã đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {user.bfjOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-red-400">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-300">
                        {order.estimatedVnd ? Number(order.estimatedVnd).toLocaleString('vi-VN') + ' ₫' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Bids */}
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-200">Lịch sử đặt giá ({user._count.bids})</h2>
            </div>
            {user.bids.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Chưa đặt giá lần nào</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Phiên</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {user.bids.map((bid) => (
                    <tr key={bid.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        <Link href={`/admin/auctions/${bid.auction.id}`} className="hover:text-red-400">
                          {bid.auction.auctionNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-200">
                        {Number(bid.amount).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BID_STATUS_COLORS[bid.status] ?? 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20'}`}>
                          {bid.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(bid.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Audit Logs */}
          {user.auditLogs.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
              <div className="border-b border-gray-700 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-200">Lịch sử hoạt động</h2>
              </div>
              <div className="divide-y divide-gray-700/50">
                {user.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/30 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-gray-300">{log.action}</p>
                      <p className="text-xs text-gray-500">{log.resourceType} · {log.ipAddress ?? 'N/A'}</p>
                    </div>
                    <p className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Profile info */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Thông tin cá nhân</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vai trò</span>
                <span className="text-sm text-gray-300">{ROLE_LABELS[user.role as UserRole]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Trạng thái</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[user.status as UserStatus]}`}>
                  {STATUS_LABELS[user.status as UserStatus]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</span>
                <span className={`flex items-center gap-1 text-xs ${user.emailVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {user.emailVerified
                    ? <><CheckCircle2 className="h-3 w-3" /> Xác minh</>
                    : <><AlertCircle className="h-3 w-3" /> Chưa xác minh</>
                  }
                </span>
              </div>
              {user.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">SĐT</span>
                  <span className="text-sm text-gray-300">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ngày đăng ký</span>
                <span className="text-sm text-gray-300">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <ResetPasswordButton userId={user.id} />
            </div>
          </div>

          {/* Deposit requests */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Đặt cọc đấu giá</h3>
            {user.transactions.length === 0 ? (
              <p className="text-xs text-gray-500">Chưa có yêu cầu đặt cọc nào</p>
            ) : (
              <div className="space-y-3">
                {user.transactions.map((t) => {
                  const proofUrl = t.notes?.startsWith('proof:') ? t.notes.split('proof:')[1]?.split('|')[0] : null
                  const isPending = t.status === 'PENDING'
                  return (
                    <div key={t.id} className={`rounded-lg border p-3 ${isPending ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-700 bg-gray-900/40'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {Number(t.amount).toLocaleString('vi-VN')} ₫
                          </p>
                          <p className="font-mono text-xs text-gray-500">{t.txnNumber}</p>
                          {t.paymentRef && (
                            <p className="text-xs text-gray-500">Mã CK: <span className="font-mono">{t.paymentRef}</span></p>
                          )}
                          <p className="text-xs text-gray-600">{new Date(t.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        {proofUrl && (
                          <a href={proofUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20 transition whitespace-nowrap"
                          >
                            🖼 Xem phiếu
                          </a>
                        )}
                      </div>
                      {isPending ? (
                        <DepositActions
                          txnId={t.id}
                          txnNumber={t.txnNumber}
                          amount={Number(t.amount)}
                          userName={user.profile?.fullName ?? user.email ?? '—'}
                        />
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === 'COMPLETED'
                            ? 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20'
                            : 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20'
                        }`}>
                          {t.status === 'COMPLETED' ? '✓ Đã duyệt' : '✗ Từ chối'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Wallet */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Ví tiền</h3>
            {user.wallet ? (
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Số dư</span>
                  <span className="font-bold text-green-400">
                    {Number(user.wallet.balance).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Đang khoá</span>
                  <span className="text-yellow-400">
                    {Number(user.wallet.lockedBalance).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Khả dụng</span>
                  <span className="font-bold text-gray-200">
                    {walletAvailable.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Chưa có ví</p>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-200">Thống kê</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Đơn mua hộ</span>
                <span className="text-gray-200">{user._count.bfjOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lượt đặt giá</span>
                <span className="text-gray-200">{user._count.bids}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Thông báo</span>
                <span className="text-gray-200">{user._count.notifications}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
