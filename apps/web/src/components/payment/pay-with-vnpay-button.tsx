'use client'

import { useState } from 'react'

type Props = {
  purpose: 'AUCTION_SETTLEMENT' | 'BFJ_DEPOSIT'
  referenceId: string
  amount: number
  label?: string
  className?: string
}

export function PayWithVnpayButton({ purpose, referenceId, amount, label, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, referenceId }),
      })
      const data = await res.json()
      if (!data.success || !data.data?.paymentUrl) {
        throw new Error(data.error ?? 'Không tạo được giao dịch')
      }
      window.location.href = data.data.paymentUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading}
        className={className ?? 'w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition'}
      >
        {loading ? 'Đang chuyển tới VNPay...' : (label ?? `Thanh toán ${amount.toLocaleString('vi-VN')}₫ qua VNPay`)}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">❌ {error}</p>}
    </div>
  )
}
