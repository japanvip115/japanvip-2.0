'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useCartStore } from '@/store/cart'

// Đồng bộ giỏ hàng lên server (chỉ khi đã đăng nhập) để phục vụ email bỏ giỏ hàng.
// Không can thiệp logic giỏ — chỉ lắng nghe thay đổi và POST debounced.
export function CartSync() {
  const { status } = useSession()
  const items = useCartStore((s) => s.items)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = useRef<string>('')

  useEffect(() => {
    if (status !== 'authenticated') return

    const payload = JSON.stringify(items.map((i) => ({
      productId: i.productId, slug: i.slug, name: i.name, image: i.image, priceVnd: i.priceVnd, quantity: i.quantity,
    })))
    if (payload === lastSent.current) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      lastSent.current = payload
      fetch('/api/v1/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: JSON.parse(payload) }),
        keepalive: true,
      }).catch(() => { lastSent.current = '' })
    }, 2000)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [items, status])

  return null
}
