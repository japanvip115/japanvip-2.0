'use client'

import { useState } from 'react'
import { formatVND } from '@japanvip/utils'

interface WithdrawFormProps {
  availableBalance: number
}

const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000]

export function WithdrawForm({ availableBalance }: WithdrawFormProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount || numAmount < 100_000) {
      return setError('Số tiền rút tối thiểu 100,000₫')
    }
    if (numAmount > availableBalance) {
      return setError(`Vượt quá số dư khả dụng (${formatVND(availableBalance)})`)
    }
    if (!bankName.trim()) return setError('Vui lòng nhập tên ngân hàng')
    if (!accountNumber.trim()) return setError('Vui lòng nhập số tài khoản')
    if (!accountName.trim()) return setError('Vui lòng nhập tên chủ tài khoản')

    setLoading(true)
    try {
      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, bankName, accountNumber, accountName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Lỗi không xác định')
      setSuccess(`Yêu cầu rút tiền ${formatVND(numAmount)} đã được gửi. Mã: ${data.data?.txnNumber ?? ''}`)
      setAmount('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setTimeout(() => setOpen(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Rút tiền
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Yêu cầu rút tiền</h3>
              <button onClick={() => { setOpen(false); setError(''); setSuccess('') }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              Số dư khả dụng: <span className="font-bold text-gray-900">{formatVND(availableBalance)}</span>
            </div>

            {success ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
                ✓ {success}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Số tiền rút (₫)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      setAmount(digits ? parseInt(digits).toLocaleString('vi-VN') : '')
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={q > availableBalance}
                        onClick={() => setAmount(q.toLocaleString('vi-VN'))}
                        className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-brand-red hover:text-brand-red disabled:opacity-40"
                      >
                        {formatVND(q)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Ngân hàng</label>
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="VD: MB Bank, Vietcombank, Techcombank..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Số tài khoản</label>
                  <input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Chỉ nhập số"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono focus:border-brand-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Tên chủ tài khoản</label>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    placeholder="NGUYEN THI A"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase focus:border-brand-red focus:outline-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <p className="text-xs text-gray-400">
                  Yêu cầu sẽ được xử lý trong 1–2 ngày làm việc (08:00–18:30).
                </p>

                <div className="flex gap-2">
                  <button type="button" onClick={() => { setOpen(false); setError('') }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Huỷ
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 rounded-lg bg-brand-red px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
