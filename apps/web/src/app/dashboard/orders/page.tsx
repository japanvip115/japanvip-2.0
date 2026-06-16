import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getBfjOrdersByCustomer } from '@/modules/bfj/services/bfj-order.service'
import { BFJ_STATUS_LABELS, BFJ_STATUS_COLORS_LIGHT } from '@/lib/bfj-status'
import { formatVND } from '@japanvip/utils'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Đơn Hàng Mua Hộ' }

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const { orders, total, totalPages } = await getBfjOrdersByCustomer(
    session!.user!.id,
    page,
    10
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn Hàng Mua Hộ</h1>
          <p className="text-sm text-gray-500">{total} đơn hàng</p>
        </div>
        <Link
          href="/mua-ho"
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          + Tạo đơn mới
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed py-20 text-center text-gray-400">
          <p className="mb-4 text-lg font-medium">Chưa có đơn hàng nào</p>
          <Link
            href="/mua-ho"
            className="text-sm text-brand-red underline"
          >
            Bắt đầu mua hộ hàng Nhật ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block rounded-xl border bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{order.orderNumber}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        BFJ_STATUS_COLORS_LIGHT[order.status]
                      }`}
                    >
                      {BFJ_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {order.items.length} sản phẩm ·{' '}
                    {order.items
                      .slice(0, 2)
                      .map((i) => i.productName ?? i.sourcePlatform)
                      .join(', ')}
                    {order.items.length > 2 && ` và ${order.items.length - 2} sản phẩm khác`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {order.estimatedVnd ? (
                    <p className="font-bold text-brand-red">
                      {formatVND(Number(order.estimatedVnd))}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Chờ báo giá</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}`}
                  className={`h-8 w-8 rounded-full text-sm ${
                    p === page
                      ? 'bg-brand-red text-white'
                      : 'border text-gray-600 hover:bg-gray-50'
                  } flex items-center justify-center`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
