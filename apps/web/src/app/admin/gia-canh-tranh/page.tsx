import type { Metadata } from 'next'
import PricingClient from './pricing-client'

export const metadata: Metadata = { title: 'Admin — Giá Cạnh Tranh' }
export const dynamic = 'force-dynamic'

export default function AdminPricingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Giá Cạnh Tranh</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Bám giá shopnoidianhat + biên 500k–900k · dán link nguồn để lấy giá · giá đề xuất do bạn duyệt
        </p>
      </div>
      <PricingClient />
    </div>
  )
}
