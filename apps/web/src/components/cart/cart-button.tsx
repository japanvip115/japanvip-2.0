'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { CartDrawer } from './cart-drawer'

export function CartButton() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const totalItems = useCartStore((s) => s.totalItems())

  useEffect(() => {
    setMounted(true)
    const handler = () => setOpen(true)
    window.addEventListener('cart:open', handler)
    return () => window.removeEventListener('cart:open', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
        aria-label="Giỏ hàng"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="hidden sm:inline">Giỏ hàng</span>
        {mounted && totalItems > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
