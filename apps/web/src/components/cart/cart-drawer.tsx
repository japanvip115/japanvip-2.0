'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { formatVND } from '@japanvip/utils'
import { trackViewCart } from '@/lib/fbq'

const JPY_RATE = 175

type Props = {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, removeItem, updateQuantity } = useCartStore()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const totalVnd = items.reduce((sum, item) => {
    if (item.priceVnd) return sum + item.priceVnd * item.quantity
    if (item.priceJpy) return sum + item.priceJpy * JPY_RATE * item.quantity
    return sum
  }, 0)

  // Meta Pixel: khách mở giỏ hàng để xem
  useEffect(() => {
    if (!open || items.length === 0) return
    trackViewCart({
      ids: items.map((i) => i.productId),
      value: totalVnd,
      numItems: items.reduce((s, i) => s + i.quantity, 0),
      items: items.map((i) => ({ id: i.productId, name: i.name, quantity: i.quantity })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const hasUnpricedItems = items.some((i) => !i.priceJpy && !i.priceVnd)

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile: bottom sheet — Desktop: right panel anchored top */}
      <div
        className={`
          fixed z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300
          /* mobile: slide up from bottom, auto height, max 85dvh */
          bottom-0 left-0 right-0 rounded-t-2xl max-h-[85dvh]
          /* desktop: slide from right, anchored top-right, max 420px, rounded left side */
          sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:w-[420px] sm:h-auto sm:max-h-screen sm:rounded-t-none sm:rounded-l-2xl
          ${open
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Giỏ hàng</span>
            {items.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-red text-white text-xs font-bold">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
            aria-label="Đóng giỏ hàng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items — scrollable, shrinks when few items */}
        <div className="overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <span className="text-4xl mb-3">🛒</span>
              <p className="text-sm text-gray-500 mb-3">Giỏ hàng của bạn đang trống</p>
              <button onClick={onClose} className="text-sm font-semibold text-brand-red hover:underline">
                Tiếp tục mua sắm →
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 items-start py-2 border-b border-gray-100 last:border-0">
                  {/* Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border bg-gray-50">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="56px" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${item.slug}`}
                      onClick={onClose}
                      className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug hover:text-brand-red"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 text-sm font-bold text-brand-red">
                      {item.priceVnd
                        ? formatVND(item.priceVnd)
                        : item.priceJpy
                        ? formatVND(item.priceJpy * JPY_RATE)
                        : <span className="text-amber-600 font-medium text-xs">Liên hệ báo giá</span>}
                    </div>
                  </div>

                  {/* Qty + remove */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-base leading-none"
                      >−</button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-base leading-none"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 pt-3 pb-4 space-y-2.5 bg-white">
            {hasUnpricedItems && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
                ⚠ Một số sản phẩm cần liên hệ để xác nhận giá trước khi đặt hàng.
              </p>
            )}
            {totalVnd > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Tạm tính</span>
                <span className="text-base font-bold text-gray-900">{formatVND(totalVnd)}</span>
              </div>
            )}
            <Link
              href="/gio-hang"
              onClick={onClose}
              className="block w-full rounded-xl bg-brand-red py-3 text-center text-sm font-bold text-white hover:bg-red-700 active:scale-[.98] transition"
            >
              Xem giỏ hàng & Đặt hàng
            </Link>
            <button
              onClick={onClose}
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        )}
      </div>
    </>
  )
}
