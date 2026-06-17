import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import type { UserRole, UserStatus, Prisma } from '@japanvip/db'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Quản Lý Người Dùng' }

const ROLE_TABS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Khách hàng', value: 'CUSTOMER' },
  { label: 'Đối tác', value: 'PARTNER' },
  { label: 'Admin', value: 'ADMIN' },
]

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

const ROLE_COLORS: Record<UserRole, string> = {
  CUSTOMER: 'text-gray-400',
  PARTNER: 'text-blue-400',
  ADMIN: 'text-orange-400',
  SUPER_ADMIN: 'text-red-400',
}

type SearchParams = Promise<{ role?: string; status?: string; page?: string; q?: string; deposit?: string }>

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const { role = 'ALL', status = '', page = '1', q = '', deposit = '' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const take = 25
  const skip = (pageNum - 1) * take

  const where: Prisma.UserWhereInput = {
    ...(role !== 'ALL' ? { role: role as UserRole } : {}),
    ...(status ? { status: status as UserStatus } : {}),
    ...(deposit === 'yes' ? { transactions: { some: { type: 'DEPOSIT' as const, status: 'COMPLETED' as const } } } : {}),
    ...(deposit === 'no' ? { NOT: { transactions: { some: { type: 'DEPOSIT' as const, status: 'COMPLETED' as const } } } } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { profile: { fullName: { contains: q, mode: 'insensitive' as const } } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    deletedAt: null,
  }

  const [rawUsers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        profile: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { bfjOrders: true, bids: true } },
        transactions: {
          where: { type: 'DEPOSIT' },
          select: { status: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Phân tầng: 0=Đã cọc, 1=Chưa cọc (có hoạt động), 2=Nhận tin tức (chưa có gì)
  function getUserTier(u: typeof rawUsers[0]): number {
    const hasDeposit = u.transactions[0]?.status === 'COMPLETED'
    if (hasDeposit) return 0
    const hasActivity = u._count.bfjOrders > 0 || u._count.bids > 0
    if (hasActivity) return 1
    return 2
  }

  const users = [...rawUsers].sort((a, b) => {
    const tierDiff = getUserTier(a) - getUserTier(b)
    if (tierDiff !== 0) return tierDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const totalPages = Math.ceil(total / take)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản Lý Người Dùng</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} người dùng</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <form method="GET" className="flex flex-1 gap-2 max-w-lg">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="status" value={status} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm email, tên, số điện thoại..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            />
            <button
              type="submit"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
            >
              Tìm
            </button>
          </form>
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="q" value={q} />
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
            >
              Lọc
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {ROLE_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/admin/users?role=${tab.value}&q=${q}&status=${status}&deposit=${deposit}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  role === tab.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-l border-gray-700 pl-2">
            {[
              { label: 'Tất cả cọc', value: '' },
              { label: '✓ Đã cọc', value: 'yes' },
              { label: '— Chưa cọc', value: 'no' },
            ].map((tab) => (
              <Link
                key={tab.value}
                href={`/admin/users?role=${role}&q=${q}&status=${status}&deposit=${tab.value}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  deposit === tab.value
                    ? tab.value === 'yes'
                      ? 'bg-green-700 text-white'
                      : tab.value === 'no'
                      ? 'bg-gray-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Liên hệ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Vai trò</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Đặt cọc</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Đơn / Bid</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày đăng ký</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  Không tìm thấy người dùng
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const tier = getUserTier(user)
                const rowClass =
                  tier === 0
                    ? 'border-l-2 border-l-green-500 bg-green-900/5 hover:bg-green-900/10'
                    : tier === 1
                    ? 'border-l-2 border-l-yellow-500 bg-yellow-900/5 hover:bg-yellow-900/10'
                    : 'border-l-2 border-l-gray-600 hover:bg-gray-700/20 opacity-70'
                return (
                <tr key={user.id} className={`transition-colors cursor-pointer ${rowClass}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
                        {(user.profile?.fullName ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="max-w-[160px] truncate text-sm font-medium text-gray-300">
                            {user.profile?.fullName ?? '—'}
                          </p>
                          {tier === 0 && <span className="shrink-0 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">Đã cọc</span>}
                          {tier === 1 && <span className="shrink-0 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">Hoạt động</span>}
                          {tier === 2 && <span className="shrink-0 rounded-full bg-gray-700 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Tin tức</span>}
                        </div>
                        <p className="font-mono text-xs text-gray-500">{user.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300">{user.email}</p>
                    {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                    {!user.emailVerified && (
                      <span className="text-xs text-yellow-400">Chưa xác minh email</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${ROLE_COLORS[user.role as UserRole]}`}>
                      {ROLE_LABELS[user.role as UserRole]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[user.status as UserStatus]}`}>
                      {STATUS_LABELS[user.status as UserStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const dep = user.transactions[0]
                      if (!dep) return <span className="text-xs text-gray-600">—</span>
                      if (dep.status === 'COMPLETED') return <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20 whitespace-nowrap">✓ Đã cọc</span>
                      if (dep.status === 'PENDING') return <span className="inline-flex items-center rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20 whitespace-nowrap">⏳ Chờ duyệt</span>
                      return <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20 whitespace-nowrap">✗ Từ chối</span>
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {user._count.bfjOrders} / {user._count.bids}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline whitespace-nowrap"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Trang {pageNum} / {totalPages}</span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={`/admin/users?role=${role}&q=${q}&status=${status}&page=${pageNum - 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
              >
                ← Trước
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`/admin/users?role=${role}&q=${q}&status=${status}&page=${pageNum + 1}`}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
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
