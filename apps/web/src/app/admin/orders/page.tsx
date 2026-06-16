import type { Metadata } from 'next'
import { adminListBfjOrders } from '@/modules/bfj/services/bfj-order.service'
import { BFJ_STATUS_LABELS, BFJ_STATUS_COLORS } from '@/lib/bfj-status'
import { formatVND } from '@japanvip/utils'
import Link from 'next/link'
import type { BfjOrderStatus } from '@japanvip/db'
import { Eye } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản lý đơn Mua Hộ — Admin' }

const ALL_STATUSES: BfjOrderStatus[] = [
  'PENDING_REVIEW', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED',
  'ORDERING', 'ORDERED_FROM_JAPAN', 'IN_TRANSIT_JP',
  'CUSTOMS_CLEARANCE', 'IN_TRANSIT_VN', 'DELIVERED', 'CANCELLED',
]

type Props = {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { page: pageParam, status, search } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))

  const { orders, total, totalPages } = await adminListBfjOrders({
    page,
    limit: 20,
    status: (status as BfjOrderStatus) || undefined,
    search: search || undefined,
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Đơn Hàng Mua Hộ</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} đơn hàng</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <form method="GET" className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Tìm theo mã đơn, email..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
          >
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !status
                ? 'bg-gray-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            Tất cả
          </Link>
          {ALL_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-gray-700 text-white'
                  : 'border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {BFJ_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mã đơn</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Khách hàng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Giá trị</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {orders.map((order) => (
              <tr key={order.id} className={`hover:bg-gray-700/30 transition-colors cursor-pointer ${order.depositProofUrl && !order.depositPaid ? 'bg-yellow-500/5 ring-1 ring-inset ring-yellow-500/10' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-200">{order.customer.profile?.fullName ?? '—'}</p>
                  <p className="text-xs text-gray-500">{order.customer.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{order.items.length} sản phẩm</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BFJ_STATUS_COLORS[order.status]}`}
                    >
                      {BFJ_STATUS_LABELS[order.status]}
                    </span>
                    {order.depositProofUrl && !order.depositPaid && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-300 ring-1 ring-yellow-500/30 animate-pulse">
                        🧾 Chờ xác nhận cọc
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-300 font-medium">
                  {order.estimatedVnd
                    ? formatVND(Number(order.estimatedVnd))
                    : <span className="text-gray-500">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  Không có đơn hàng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
              className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors ${
                p === page
                  ? 'bg-gray-700 text-white'
                  : 'border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
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
