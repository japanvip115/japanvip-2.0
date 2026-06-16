import type { Metadata } from 'next'
import { CartPageClient } from './cart-page-client'

export const metadata: Metadata = {
  title: 'Giỏ hàng — Japan VIP',
  robots: { index: false },
}

export default function CartPage() {
  return <CartPageClient />
}
