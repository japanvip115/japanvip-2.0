'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { formatVND } from '@japanvip/utils'
import { trackViewCart, trackPurchase } from '@/lib/fbq'

const FALLBACK_JPY_RATE = 175

export function CartPageClient() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, clear } = useCartStore()
  const [JPY_RATE, setJpyRate] = useState(FALLBACK_JPY_RATE)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch('/api/v1/exchange-rate?from=JPY&to=VND')
      .then((r) => r.json())
      .then((d) => { if (d?.data?.rate) setJpyRate(d.data.rate) })
      .catch(() => {})
  }, [])
  const [isOrdering, setIsOrdering] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; orderId: string } | null>(null)
  const [error, setError] = useState('')

  const totalVnd = items.reduce((sum, item) => {
    if (item.priceVnd) return sum + item.priceVnd * item.quantity
    if (item.priceJpy) return sum + item.priceJpy * JPY_RATE * item.quantity
    return sum
  }, 0)

  const hasUnpricedItems = items.some((i) => !i.priceJpy && !i.priceVnd)

  // Meta Pixel: khách xem giỏ hàng (bắn 1 lần khi có sản phẩm)
  const viewCartFired = useRef(false)
  useEffect(() => {
    if (viewCartFired.current || items.length === 0) return
    viewCartFired.current = true
    trackViewCart({
      ids: items.map((i) => i.productId),
      value: totalVnd,
      numItems: items.reduce((s, i) => s + i.quantity, 0),
      items: items.map((i) => ({ id: i.productId, name: i.name, quantity: i.quantity })),
    })
  }, [items, totalVnd])

  async function handleOrder() {
    setIsOrdering(true)
    setError('')
    try {
      // Check login status
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      if (!session?.user) {
        router.push('/login?callbackUrl=/gio-hang')
        return
      }

      // Create order with cart items
      const res = await fetch('/api/v1/bfj/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            sourceUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://japanvip.vn'}/${item.slug}`,
            productName: item.name,
            productImage: item.image,
            unitPriceJpy: item.priceJpy ?? null,
            quantity: item.quantity,
          })),
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Đặt hàng thất bại')
      trackPurchase({
        ids: items.map((i) => i.productId),
        value: totalVnd,
        numItems: items.reduce((s, i) => s + i.quantity, 0),
        transactionId: data.data.orderNumber,
        items: items.map((i) => ({ id: i.productId, name: i.name, quantity: i.quantity })),
      })
      clear()
      setOrderSuccess({ orderNumber: data.data.orderNumber, orderId: data.data.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsOrdering(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-2xl font-bold text-green-700 mb-3">Đặt hàng thành công!</h1>
        <p className="text-gray-600 mb-2">
          Đơn hàng <strong className="text-gray-900">{orderSuccess.orderNumber}</strong> đã được tạo.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Nhân viên Japan VIP sẽ liên hệ xác nhận và báo giá chi tiết trong thời gian sớm nhất.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/dashboard/orders/${orderSuccess.orderId}`}
            className="rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            Xem đơn hàng →
          </Link>
          <Link
            href="/san-pham"
            className="rounded-xl border px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Giỏ hàng của bạn</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-gray-500 mb-6">Giỏ hàng trống</p>
          <Link href="/san-pham" className="rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-red-700">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 rounded-xl border bg-white p-4">
                {item.image ? (
                  <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden border bg-gray-50">
                    <Image src={item.image} alt={item.name} fill className="object-contain p-1.5" sizes="96px" />
                  </div>
                ) : (
                  <div className="h-24 w-24 shrink-0 rounded-lg border bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/${item.slug}`} className="text-sm font-semibold text-gray-900 hover:text-brand-red line-clamp-2">
                    {item.name}
                  </Link>
                  <div className="mt-1 text-base font-bold text-brand-red">
                    {item.priceVnd
                      ? formatVND(item.priceVnd)
                      : item.priceJpy
                      ? `¥${item.priceJpy.toLocaleString()} (~${formatVND(item.priceJpy * JPY_RATE)})`
                      : <span className="text-sm font-medium text-amber-600">Liên hệ để biết giá</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="px-3 py-1.5 text-gray-500 hover:text-gray-900">−</button>
                      <span className="px-3 text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="px-3 py-1.5 text-gray-500 hover:text-gray-900">+</button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="text-xs text-gray-400 hover:text-red-500">
                      Xóa
                    </button>
                  </div>
                </div>
                {(item.priceVnd || item.priceJpy) && (
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-500">Thành tiền</p>
                    <p className="font-bold text-gray-900">
                      {item.priceVnd
                        ? formatVND(item.priceVnd * item.quantity)
                        : formatVND((item.priceJpy ?? 0) * JPY_RATE * item.quantity)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>

              <div className="space-y-2 text-sm mb-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-gray-600">
                    <span className="line-clamp-1 flex-1 mr-2">{item.name} ×{item.quantity}</span>
                    <span className="shrink-0">
                      {item.priceVnd
                        ? formatVND(item.priceVnd * item.quantity)
                        : item.priceJpy
                        ? formatVND(item.priceJpy * JPY_RATE * item.quantity)
                        : 'Liên hệ'}
                    </span>
                  </div>
                ))}
              </div>

              {totalVnd > 0 && (
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Tạm tính</span>
                    <span className="text-brand-red">{formatVND(totalVnd)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Chưa bao gồm phí vận chuyển</p>
                </div>
              )}

              {hasUnpricedItems && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 mb-4">
                  ⚠ Một số sản phẩm chưa có giá. Nhân viên sẽ báo giá sau khi xác nhận đơn.
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Yêu cầu đặc biệt, màu sắc, kích cỡ..."
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-red resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">❌ {error}</div>
              )}

              <button
                onClick={handleOrder}
                disabled={isOrdering}
                className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                {isOrdering ? 'Đang xử lý...' : 'Xác Nhận Đặt Hàng'}
              </button>

              <div className="mt-3 flex flex-col gap-1 text-xs text-gray-400 text-center">
                <span>🔒 Thanh toán an toàn</span>
                <span>📞 Hỗ trợ: 0988.969.896</span>
              </div>
            </div>

            <Link
              href="/san-pham"
              className="block text-center text-sm text-gray-500 hover:text-brand-red"
            >
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
