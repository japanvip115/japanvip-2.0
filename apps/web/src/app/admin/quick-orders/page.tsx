import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import type { QuickOrderStatus } from '@japanvip/db'

export const metadata: Metadata = { title: 'Đặt Hàng Nhanh — Admin' }

const STATUS_LABELS: Record<QuickOrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONTACTED: 'Đã liên hệ',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

const STATUS_COLORS: Record<QuickOrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  CONTACTED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  CONFIRMED: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border border-green-500/30',
  CANCELLED: 'bg-red-900/40 text-red-400 border border-red-700/30',
}

const ALL_STATUSES: QuickOrderStatus[] = ['PENDING', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

type Props = {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export default async function AdminQuickOrdersPage({ searchParams }: Props) {
  const { page: pageParam, status, search } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const where = {
    ...(status ? { status: status as QuickOrderStatus } : {}),
    ...(search ? {
      OR: [
        { orderRef: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.quickOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.quickOrder.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Đặt Hàng Nhanh</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} đơn hàng</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <form method="GET" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Tìm theo mã đơn, tên, email, SĐT..."
            className="w-72 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 cursor-pointer">
            Tìm
          </button>
        </form>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/quick-orders" className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!status ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
          Tất cả
        </Link>
        {ALL_STATUSES.map(s => (
          <Link key={s} href={`/admin/quick-orders?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === s ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">SL</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {orders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-600">Chưa có đơn hàng nào.</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{order.orderRef}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-100">{order.name}</div>
                  <div className="text-xs text-gray-500">{order.email}</div>
                  <div className="text-xs text-gray-500">{order.phone}</div>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="truncate text-gray-200">{order.productName}</div>
                </td>
                <td className="px-4 py-3 text-gray-300">{order.quantity}</td>
                <td className="px-4 py-3 font-semibold text-red-400">
                  {order.priceVnd ? `${Number(order.priceVnd).toLocaleString('vi-VN')}₫` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {order.createdAt.toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/quick-orders/${order.id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors">
                    <Eye className="h-3.5 w-3.5" /> Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/admin/quick-orders?page=${p}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${p === page ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
