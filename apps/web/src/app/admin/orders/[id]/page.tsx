import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { BFJ_STATUS_LABELS, BFJ_STATUS_COLORS } from '@/lib/bfj-status'
import { formatVND, formatJPY } from '@japanvip/utils'
import { AdminOrderActions } from './admin-order-actions'
import Link from 'next/link'
import type { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const order = await prisma.bfjOrder.findUnique({ where: { id }, select: { orderNumber: true } })
  return { title: order ? `Đơn ${order.orderNumber} — Admin` : 'Đơn hàng' }
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await prisma.bfjOrder.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          phone: true,
          profile: { select: { fullName: true } },
        },
      },
      items: true,
      address: true,
      exchangeRate: true,
    },
  })
  if (!order) notFound()

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          &larr; Danh sách đơn
        </Link>
        <span className="text-gray-600">/</span>
        <span className="font-mono text-sm font-medium text-gray-300">{order.orderNumber}</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BFJ_STATUS_COLORS[order.status]}`}>
          {BFJ_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Sản phẩm ({order.items.length})</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border border-gray-700 bg-gray-900 p-3">
                  {item.productImage && (
                    <img
                      src={item.productImage}
                      alt=""
                      className="h-14 w-14 rounded object-cover border border-gray-700"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{item.sourcePlatform}</p>
                    <p className="text-sm font-medium text-gray-200 line-clamp-1">
                      {item.productName ?? 'Không rõ'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {item.unitPriceJpy && <span>{formatJPY(Number(item.unitPriceJpy))}</span>}
                      <span>x {item.quantity}</span>
                      {item.variation && <span className="text-gray-500">· {item.variation}</span>}
                    </div>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                    >
                      Link gốc &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">Tài chính</h2>
            <div className="space-y-2 text-sm">
              {order.estimatedJpy && (
                <div className="flex justify-between text-gray-400">
                  <span>Giá gốc (JPY)</span>
                  <span>{formatJPY(Number(order.estimatedJpy))}</span>
                </div>
              )}
              {order.exchangeRate && (
                <div className="flex justify-between text-gray-400">
                  <span>Tỷ giá áp dụng</span>
                  <span>1 JPY = {Number(order.exchangeRate.rate).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
              {order.estimatedVnd && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ước tính VNĐ</span>
                  <span className="text-gray-300">{formatVND(Number(order.estimatedVnd))}</span>
                </div>
              )}
              {order.finalVnd && (
                <div className="flex justify-between font-bold">
                  <span className="text-gray-200">Giá thực tế</span>
                  <span className="text-red-400">{formatVND(Number(order.finalVnd))}</span>
                </div>
              )}
              {order.depositAmount && (
                <div className="flex justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
                  <span className="text-yellow-400">Đặt cọc</span>
                  <span className={`font-bold text-yellow-400 ${order.depositPaid ? 'line-through opacity-60' : ''}`}>
                    {formatVND(Number(order.depositAmount))}
                    {order.depositPaid && ' (đã thanh toán)'}
                  </span>
                </div>
              )}
              {order.profitVnd !== null && order.profitVnd !== undefined && (
                <div className="flex justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
                  <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Lợi nhuận ước tính</span>
                  <span className="font-bold text-green-400">
                    +{formatVND(Number(order.profitVnd))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deposit proof */}
          {order.depositProofUrl && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Biên Lai Đặt Cọc</h2>
                {order.depositSubmittedAt && (
                  <span className="text-xs text-gray-500">
                    Gửi lúc {new Date(order.depositSubmittedAt).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
              <a href={order.depositProofUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={order.depositProofUrl}
                  alt="Biên lai"
                  className="max-h-64 rounded-lg border border-gray-700 object-contain hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </a>
              {order.depositProofNote && (
                <p className="mt-2 text-sm text-gray-400 italic">"{order.depositProofNote}"</p>
              )}
              {!order.depositPaid && (
                <p className="mt-3 text-xs text-yellow-400 font-medium">
                  ⚠ Chưa xác nhận — cập nhật trạng thái sang "Đã nhận cọc" để xác nhận
                </p>
              )}
              {order.depositPaid && (
                <p className="mt-3 text-xs text-green-400 font-medium">✓ Đã xác nhận nhận cọc</p>
              )}
            </div>
          )}

          {/* Tracking */}
          {(order.trackingJp || order.trackingVn) && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-200">Vận chuyển</h2>
              {order.trackingJp && (
                <p className="text-sm text-gray-300">Nhật: <span className="font-mono text-xs text-gray-400">{order.trackingJp}</span></p>
              )}
              {order.trackingVn && (
                <p className="text-sm text-gray-300">VN: <span className="font-mono text-xs text-gray-400">{order.trackingVn}</span></p>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Customer + address compact card */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/60 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Khách hàng</span>
            </div>
            <div className="px-4 py-3">
              <p className="font-semibold text-gray-100">{order.customer.profile?.fullName ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-xs text-gray-500">{order.customer.phone}</p>
              )}
            </div>
            {order.address && (
              <div className="px-4 py-3 border-t border-gray-700/60 bg-gray-900/30">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Địa chỉ giao hàng</p>
                <p className="text-sm text-gray-300">{order.address.recipientName} · {order.address.phone}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {[order.address.street, order.address.ward, order.address.district, order.address.province].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Actions form */}
          <AdminOrderActions order={{
            id: order.id,
            status: order.status,
            adminNotes: order.adminNotes,
            trackingJp: order.trackingJp,
            trackingVn: order.trackingVn,
            estimatedVnd: order.estimatedVnd ? Number(order.estimatedVnd) : null,
            depositAmount: order.depositAmount ? Number(order.depositAmount) : null,
            finalVnd: order.finalVnd ? Number(order.finalVnd) : null,
          }} />
        </div>
      </div>
    </div>
  )
}
