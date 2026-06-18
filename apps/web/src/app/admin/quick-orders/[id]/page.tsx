import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuickOrderActions } from './quick-order-actions'
import type { QuickOrderStatus } from '@japanvip/db'

export const metadata: Metadata = { title: 'Chi tiết đơn đặt hàng nhanh — Admin' }

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

const CARD = 'rounded-xl border border-gray-700 bg-gray-800/60 p-5'
const LABEL = 'text-xs font-semibold uppercase tracking-wide text-gray-500'
const VALUE = 'mt-1 text-sm text-gray-100'

type Props = { params: Promise<{ id: string }> }

export default async function QuickOrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await prisma.quickOrder.findUnique({ where: { id } })
  if (!order) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/quick-orders" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{order.orderRef}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Tạo lúc {order.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* LEFT — order info */}
        <div className="space-y-5 lg:col-span-2">

          {/* Khách hàng */}
          <div className={CARD}>
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Thông tin khách hàng</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className={LABEL}>Họ tên</p>
                <p className={VALUE}>{order.name}</p>
              </div>
              <div>
                <p className={LABEL}>Điện thoại</p>
                <a href={`tel:${order.phone}`} className="mt-1 block text-sm font-semibold text-red-400 hover:text-red-300">
                  {order.phone}
                </a>
              </div>
              <div>
                <p className={LABEL}>Email</p>
                <a href={`mailto:${order.email}`} className="mt-1 block text-sm text-blue-400 hover:text-blue-300 break-all">
                  {order.email}
                </a>
              </div>
              {order.address && (
                <div className="col-span-2 sm:col-span-3">
                  <p className={LABEL}>Địa chỉ</p>
                  <p className={VALUE}>{order.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sản phẩm */}
          <div className={CARD}>
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Thông tin sản phẩm</h2>
            <div className="flex gap-4">
              {order.productImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.productImage} alt={order.productName}
                  className="h-20 w-20 shrink-0 rounded-lg border border-gray-700 object-contain bg-gray-900 p-1" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-100">{order.productName}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <p className={LABEL}>Số lượng</p>
                    <p className={VALUE}>{order.quantity}</p>
                  </div>
                  <div>
                    <p className={LABEL}>Đơn giá</p>
                    <p className="mt-1 text-sm font-semibold text-red-400">
                      {order.priceVnd ? `${Number(order.priceVnd).toLocaleString('vi-VN')}₫` : '—'}
                    </p>
                  </div>
                  {order.priceVnd && (
                    <div>
                      <p className={LABEL}>Tổng tiền</p>
                      <p className="mt-1 text-sm font-semibold text-red-400">
                        {(Number(order.priceVnd) * order.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  )}
                </div>
                {order.productSlug && (
                  <Link href={`/${order.productSlug}`} target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    Xem trang sản phẩm →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Ghi chú khách */}
          {order.notes && (
            <div className={CARD}>
              <h2 className="mb-2 text-sm font-semibold text-gray-200">Ghi chú của khách</h2>
              <p className="text-sm text-gray-400 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>

        {/* RIGHT — actions */}
        <div className="space-y-5">
          <div className={CARD}>
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Xử lý đơn hàng</h2>
            <QuickOrderActions id={order.id} status={order.status} adminNotes={order.adminNotes} />
          </div>

          {/* Quick actions */}
          <div className={CARD}>
            <h2 className="mb-3 text-sm font-semibold text-gray-200">Liên hệ nhanh</h2>
            <div className="space-y-2">
              <a href={`tel:${order.phone}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700/30 border border-green-700/40 px-3 py-2 text-sm font-medium text-green-300 hover:bg-green-700/50 transition-colors">
                📞 Gọi {order.phone}
              </a>
              <a href={`mailto:${order.email}?subject=Đơn hàng ${order.orderRef} — Japan VIP`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700/20 border border-blue-700/30 px-3 py-2 text-sm font-medium text-blue-300 hover:bg-blue-700/40 transition-colors">
                ✉️ Gửi email
              </a>
              <a href={`https://zalo.me/${order.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/40 transition-colors">
                💬 Zalo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
