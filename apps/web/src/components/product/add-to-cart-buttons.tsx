'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'
import { ShoppingCart, Zap, Check } from 'lucide-react'
import { QuickOrderModal } from './quick-order-modal'
import { trackFb, CURRENCY } from '@/lib/fbq'

type Props = {
  productId: string
  slug: string
  name: string
  image: string | null
  priceJpy: number | null
  priceVnd: number | null
}

export function AddToCartButtons({ productId, slug, name, image, priceJpy, priceVnd }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const [quickOrderOpen, setQuickOrderOpen] = useState(false)

  // Meta Pixel: khách xem chi tiết sản phẩm
  useEffect(() => {
    trackFb('ViewContent', {
      content_ids: [productId],
      content_name: name,
      content_type: 'product',
      ...(priceVnd ? { value: priceVnd, currency: CURRENCY } : {}),
    })
  }, [productId, name, priceVnd])

  function handleAddToCart() {
    addItem({ productId, slug, name, image, priceJpy, priceVnd })
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
    window.dispatchEvent(new CustomEvent('cart:open'))
    trackFb('AddToCart', {
      content_ids: [productId],
      content_name: name,
      content_type: 'product',
      contents: [{ id: productId, quantity: 1 }],
      ...(priceVnd ? { value: priceVnd, currency: CURRENCY } : {}),
    })
  }

  function handleBuyNow() {
    setQuickOrderOpen(true)
    trackFb('InitiateCheckout', {
      content_ids: [productId],
      content_name: name,
      content_type: 'product',
      num_items: 1,
      ...(priceVnd ? { value: priceVnd, currency: CURRENCY } : {}),
    })
  }

  return (
    <>
      <div className="flex gap-3">
        {/* Add to cart — outlined dark */}
        <button
          onClick={handleAddToCart}
          style={added ? {} : {border: '1px solid #fca5a5'}}
          className={`
            group relative flex flex-1 cursor-pointer items-center justify-center gap-2
            overflow-hidden rounded-xl px-4 py-3.5 text-sm font-bold
            transition-all duration-200 active:scale-[.97]
            ${added
              ? 'border border-emerald-500 bg-emerald-50 text-emerald-600'
              : 'bg-white text-slate-800 hover:bg-red-50'
            }
          `}
        >
          {added ? (
            <>
              <Check className="h-4 w-4 shrink-0" />
              Đã thêm!
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
              Thêm vào giỏ
            </>
          )}
        </button>

        {/* Buy now — opens quick order modal */}
        <button
          onClick={handleBuyNow}
          className="
            group relative flex flex-1 cursor-pointer items-center justify-center gap-2
            overflow-hidden rounded-xl bg-brand-red px-4 py-3.5 text-sm font-bold text-white
            shadow-md shadow-red-200 transition-all duration-200
            hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 active:scale-[.97]
          "
        >
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <Zap className="relative h-4 w-4 shrink-0" />
          <span className="relative">Đặt Hàng Ngay</span>
        </button>
      </div>

      <QuickOrderModal
        open={quickOrderOpen}
        onClose={() => setQuickOrderOpen(false)}
        product={{ id: productId, slug, name, image, priceVnd }}
      />
    </>
  )
}
