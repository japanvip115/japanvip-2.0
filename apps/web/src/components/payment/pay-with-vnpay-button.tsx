'use client'

import { useState } from 'react'

type Props = {
  purpose: 'AUCTION_SETTLEMENT' | 'BFJ_DEPOSIT'
  referenceId: string
  amount: number
  label?: string
  className?: string
  pointsBalance?: number
  maxRedeemPercent?: number
}

export function PayWithVnpayButton({ purpose, referenceId, amount, label, className, pointsBalance = 0, maxRedeemPercent = 0 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usePoints, setUsePoints] = useState(false)

  // Số điểm tối đa dùng được cho khoản này (đồng bộ logic server, 1 điểm = 1₫)
  const maxByPercent = Math.floor((amount * maxRedeemPercent) / 100)
  const redeemable = Math.max(0, Math.min(pointsBalance, maxByPercent, amount - 1000))
  const canRedeem = redeemable > 0
  const payable = usePoints && canRedeem ? amount - redeemable : amount

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, referenceId, usePoints: usePoints && canRedeem }),
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
      {canRedeem && (
        <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={usePoints}
            onChange={(e) => setUsePoints(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-600"
          />
          <span className="text-sm text-emerald-800">
            Dùng <b>{redeemable.toLocaleString('vi-VN')} điểm</b> để giảm <b>{redeemable.toLocaleString('vi-VN')}₫</b>
            <span className="block text-xs text-emerald-600">Số dư điểm: {pointsBalance.toLocaleString('vi-VN')}</span>
          </span>
        </label>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className={className ?? 'w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition'}
      >
        {loading ? 'Đang chuyển tới VNPay...' : (label ?? `Thanh toán ${payable.toLocaleString('vi-VN')}₫ qua VNPay`)}
      </button>
      {usePoints && canRedeem && (
        <p className="mt-1.5 text-center text-xs text-gray-500">
          <span className="line-through">{amount.toLocaleString('vi-VN')}₫</span>
          {' → '}<span className="font-semibold text-emerald-600">{payable.toLocaleString('vi-VN')}₫</span>
          {' '}(đã trừ {redeemable.toLocaleString('vi-VN')} điểm)
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">❌ {error}</p>}
    </div>
  )
}
