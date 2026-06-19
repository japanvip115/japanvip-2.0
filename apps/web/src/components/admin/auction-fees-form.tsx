'use client'

import { useState } from 'react'

export function AuctionFeesForm({
  auctionFeeRate,
  shippingFee,
}: {
  auctionFeeRate: number
  shippingFee: number
}) {
  const [feeRate, setFeeRate] = useState(String(auctionFeeRate))
  const [shipping, setShipping] = useState(String(shippingFee))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true); setMsg(''); setErr('')
    try {
      const res = await fetch('/api/v1/admin/settings/auction-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionFeeRate: feeRate, shippingFee: shipping }),
      })
      const data = await res.json()
      if (data.success) setMsg('Đã lưu thành công')
      else setErr(data.error ?? 'Có lỗi xảy ra')
    } catch {
      setErr('Không thể kết nối máy chủ')
    } finally {
      setSaving(false)
    }
  }

  const previewPrice = 5_000_000
  const previewFee = Math.round(previewPrice * (parseFloat(feeRate) || 0) / 100)
  const previewShip = parseInt(shipping, 10) || 0
  const previewTotal = previewPrice + previewFee + previewShip

  function fmt(n: number) {
    return n.toLocaleString('vi-VN') + '₫'
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 space-y-5">
        {/* Phí dịch vụ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">
            Phí dịch vụ đấu giá <span className="font-normal text-gray-500">(%)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2.5 pr-10 text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="2"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Tính theo % trên giá thắng đấu giá</p>
        </div>

        {/* Phí vận chuyển */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">
            Phí vận chuyển ước tính <span className="font-normal text-gray-500">(₫)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={10000}
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2.5 pr-8 text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="150000"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₫</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Hiển thị là ước tính, thực tế có thể thay đổi theo khu vực</p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Xem trước (giá mẫu 5.000.000₫)</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Giá đấu</span>
            <span className="font-medium text-gray-200">{fmt(previewPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Phí dịch vụ ({parseFloat(feeRate) || 0}%)</span>
            <span className="font-medium text-gray-200">+{fmt(previewFee)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Phí vận chuyển</span>
            <span className="font-medium text-gray-200">+{fmt(previewShip)}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-red-900/30 px-3 py-2 font-bold">
            <span className="text-gray-300">Tổng về đến tay</span>
            <span className="text-red-400">{fmt(previewTotal)}</span>
          </div>
        </div>
      </div>

      {msg && <p className="rounded-lg bg-green-900/30 px-4 py-2.5 text-sm text-green-400">✓ {msg}</p>}
      {err && <p className="rounded-lg bg-red-900/30 px-4 py-2.5 text-sm text-red-400">⚠ {err}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
      </button>
    </div>
  )
}
