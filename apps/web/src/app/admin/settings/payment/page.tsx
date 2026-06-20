import type { Metadata } from 'next'
import { PaymentSettingsClient } from './payment-client'

export const metadata: Metadata = { title: 'Cổng thanh toán — Japan VIP Admin' }

export default function PaymentSettingsPage() {
  return <PaymentSettingsClient />
}
