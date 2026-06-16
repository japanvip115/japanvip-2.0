'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

export function ExchangeRateForm({ currentRate }: { currentRate: number | null }) {
  const router = useRouter()
  const [rate, setRate] = useState(currentRate ? String(currentRate) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rateNum = parseFloat(rate)
    if (!rateNum || rateNum <= 0) { setError('Tỷ giá phải là số dương'); return }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/v1/admin/settings/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'JPY', to: 'VND', rate: rateNum }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Đã cập nhật: 1 JPY = ${rateNum.toLocaleString('vi-VN')} ₫`)
        router.refresh()
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          1 JPY = ? VND (₫)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={currentRate ? String(currentRate) : '160'}
            step="0.01"
            min="1"
            className={INPUT_CLS + ' flex-1'}
          />
          <span className="flex items-center px-2 text-sm text-gray-400">VND</span>
        </div>
        {currentRate && rate && !isNaN(parseFloat(rate)) && parseFloat(rate) !== currentRate && (
          <p className="mt-1.5 text-xs text-yellow-400">
            Thay đổi: {currentRate.toLocaleString('vi-VN')} → {parseFloat(rate).toLocaleString('vi-VN')} ₫
            ({parseFloat(rate) > currentRate ? '+' : ''}{((parseFloat(rate) - currentRate) / currentRate * 100).toFixed(2)}%)
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-400 ring-1 ring-inset ring-red-500/20">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-green-500/15 px-3 py-2 text-sm text-green-400 ring-1 ring-inset ring-green-500/20">{success}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
      >
        {submitting ? 'Đang cập nhật...' : 'Áp dụng tỷ giá mới'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Tỷ giá mới sẽ áp dụng ngay cho tất cả đơn hàng Mua Hộ mới
      </p>
    </form>
  )
}
