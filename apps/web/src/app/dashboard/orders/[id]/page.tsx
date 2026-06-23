import { auth } from '@/lib/auth'
import { getBfjOrderDetail } from '@/modules/bfj/services/bfj-order.service'
import { BFJ_STATUS_LABELS, BFJ_STATUS_COLORS_LIGHT, BFJ_STATUS_PROGRESS } from '@/lib/bfj-status'
import { formatVND, formatJPY } from '@japanvip/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { DepositProofForm } from '@/components/order/deposit-proof-form'
import { PayWithVnpayButton } from '@/components/payment/pay-with-vnpay-button'
import { prisma } from '@japanvip/db'
import { getReferralPoints } from '@/lib/referral-settings'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Chi tiết đơn hàng` }
}

export default async function OrderDetailPage({ params }: Props) {
  const session = await auth()
  const { id } = await params
  const order = await getBfjOrderDetail(id, session!.user!.id)
  if (!order) notFound()

  const [pointsUser, referralReward] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user!.id }, select: { pointsBalance: true } }),
    getReferralPoints(),
  ])
  const pointsBalance = pointsUser?.pointsBalance ?? 0

  const progress = BFJ_STATUS_PROGRESS[order.status]
  const effectiveDeposit = order.depositAmount
    ? Number(order.depositAmount)
    : order.finalVnd
      ? Math.round(Number(order.finalVnd) * 0.3)
      : order.estimatedVnd
        ? Math.round(Number(order.estimatedVnd) * 0.3)
        : null

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">
          ← Đơn hàng
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">{order.orderNumber}</span>
      </div>

      {/* Status header */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${BFJ_STATUS_COLORS_LIGHT[order.status]}`}
          >
            {BFJ_STATUS_LABELS[order.status]}
          </span>
        </div>

        {progress > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span>Tiến độ</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-brand-red transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>

      {/* Pending review banner */}
      {order.status === 'PENDING_REVIEW' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-amber-800">Đơn hàng đang được xem xét</p>
              <p className="mt-1 text-sm text-amber-700">
                Nhân viên Japan VIP đang kiểm tra sản phẩm và tính phí chính xác. Chúng tôi sẽ thông báo qua email khi có kết quả (thường trong 1–4 giờ làm việc).
              </p>
              <p className="mt-2 text-xs text-amber-600">
                Cần gấp? <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer" className="underline font-medium">Chat Zalo</a> hoặc gọi <a href="tel:0988969896" className="underline font-medium">0988.969.896</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">Sản phẩm ({order.items.length})</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-lg border p-4">
              {item.productImage && (
                <img
                  src={item.productImage}
                  alt={item.productName ?? ''}
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400">
                  {item.sourcePlatform === 'AMAZON_JP' ? '🛒 Amazon JP'
                    : item.sourcePlatform === 'RAKUTEN' ? '🛒 Rakuten'
                    : item.sourcePlatform === 'YAHOO_SHOPPING' ? '🛒 Yahoo Shopping'
                    : '🏪 Japan VIP'}
                </p>
                <p className="mt-0.5 font-medium text-gray-900 line-clamp-2">
                  {item.productName ?? 'Không rõ tên'}
                </p>
                {item.variation && (
                  <p className="text-xs text-gray-500">{item.variation}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-sm">
                  {item.unitPriceJpy && (
                    <span className="font-semibold text-brand-red">
                      {formatJPY(Number(item.unitPriceJpy))}
                    </span>
                  )}
                  <span className="text-gray-400">× {item.quantity}</span>
                </div>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-xs text-blue-500 hover:underline"
                >
                  Xem sản phẩm gốc →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost summary */}
      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">Chi phí</h2>
        <div className="space-y-2 text-sm">
          {order.estimatedVnd ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Ước tính</span>
              <span className="font-semibold">{formatVND(Number(order.estimatedVnd))}</span>
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Nhân viên Japan VIP sẽ báo giá chi tiết sau khi xem xét đơn hàng.
            </div>
          )}
          {order.finalVnd && (
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Giá cuối</span>
              <span className="text-brand-red">{formatVND(Number(order.finalVnd))}</span>
            </div>
          )}
          {effectiveDeposit && (
            <div className="flex justify-between rounded-lg bg-orange-50 px-3 py-2 text-orange-900 border border-orange-200">
              <span className="font-medium">Đặt cọc</span>
              <span className={`font-bold ${order.depositPaid ? 'line-through text-green-600' : 'text-orange-700'}`}>
                {formatVND(effectiveDeposit)}
                {order.depositPaid && ' ✓ Đã thanh toán'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping */}
      {(order.trackingJp || order.trackingVn) && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">Vận chuyển</h2>
          {order.trackingJp && (
            <p className="text-sm">
              <span className="text-gray-500">Mã vận đơn Nhật:</span>{' '}
              <span className="font-mono font-medium">{order.trackingJp}</span>
            </p>
          )}
          {order.trackingVn && (
            <p className="text-sm mt-1">
              <span className="text-gray-500">Mã vận đơn VN:</span>{' '}
              <span className="font-mono font-medium">{order.trackingVn}</span>
            </p>
          )}
        </div>
      )}

      {/* Deposit section */}
      {order.status === 'AWAITING_DEPOSIT' && effectiveDeposit && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">Đặt Cọc</h2>
          {!order.depositPaid && (
            <div className="mb-4">
              <PayWithVnpayButton purpose="BFJ_DEPOSIT" referenceId={order.id} amount={effectiveDeposit} pointsBalance={pointsBalance} maxRedeemPercent={referralReward.maxRedeemPercent} />
              <p className="mt-2 text-center text-xs text-gray-400">Hoặc chuyển khoản thủ công bên dưới</p>
            </div>
          )}
          <DepositProofForm
            orderId={order.id}
            depositAmount={effectiveDeposit}
            alreadySubmitted={!!order.depositProofUrl}
            depositSubmittedAt={order.depositSubmittedAt?.toISOString() ?? null}
          />
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h2 className="mb-2 font-bold text-gray-900">Ghi chú của bạn</h2>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
