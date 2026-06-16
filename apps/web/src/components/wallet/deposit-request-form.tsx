'use client'

import { useState, useRef } from 'react'
import { formatVND } from '@japanvip/utils'
import Image from 'next/image'

type Props = {
  userId: string
  bankInfo: { stk: string; bankName: string; owner: string }
}

type DepositRecord = {
  id: string
  txnNumber: string
  amount: number
  paymentRef: string
  status: string
  notes: string | null
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  COMPLETED: 'Đã duyệt',
  FAILED: 'Từ chối',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  FAILED: 'bg-red-100 text-red-600 border-red-200',
}

export function DepositRequestForm({ userId, bankInfo, initialDeposits = [] }: Props & { initialDeposits?: DepositRecord[] }) {
  const [deposits, setDeposits] = useState<DepositRecord[]>(initialDeposits)
  const [step, setStep] = useState<'info' | 'form' | 'done'>('info')
  const [amount, setAmount] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [notes, setNotes] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [proofPreview, setProofPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txnNumber, setTxnNumber] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const contentCode = `DatCoc ${userId.slice(0, 8).toUpperCase()}`

  const hasPending = deposits.some((d) => d.status === 'PENDING')
  const hasApproved = deposits.some((d) => d.status === 'COMPLETED')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/v1/bfj/upload-proof', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.data?.url) {
        setProofUrl(data.data.url)
        setProofPreview(URL.createObjectURL(file))
      } else {
        setError('Upload ảnh thất bại. Vui lòng thử lại.')
      }
    } catch {
      setError('Không thể upload ảnh.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amountNum = parseInt(amount.replace(/\D/g, ''))
    if (!amountNum || amountNum < 100_000) { setError('Số tiền tối thiểu 100,000₫'); return }
    if (!paymentRef.trim()) { setError('Vui lòng nhập mã giao dịch ngân hàng'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/wallet/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, paymentRef: paymentRef.trim(), proofUrl: proofUrl || undefined, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setTxnNumber(data.txnNumber)
        setStep('done')
        setDeposits((prev) => [{
          id: data.txnNumber,
          txnNumber: data.txnNumber,
          amount: amountNum,
          paymentRef: paymentRef.trim(),
          status: 'PENDING',
          notes: null,
          createdAt: new Date().toISOString(),
        }, ...prev])
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Previous deposits */}
      {deposits.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Lịch sử đặt cọc</p>
          {deposits.map((d) => {
            const proofLink = d.notes?.startsWith('proof:') ? d.notes.split('proof:')[1]?.split('|')[0] : null
            return (
              <div key={d.id} className={`rounded-xl border px-4 py-3 ${STATUS_COLOR[d.status] ?? 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatVND(Number(d.amount))}</p>
                    <p className="text-xs opacity-75">
                      {d.txnNumber} · Mã CK: <span className="font-mono">{d.paymentRef}</span>
                    </p>
                    <p className="text-xs opacity-60">{new Date(d.createdAt).toLocaleString('vi-VN')}</p>
                    {d.status === 'FAILED' && d.notes && !d.notes.startsWith('proof:') && (
                      <p className="mt-1 text-xs font-medium">Lý do: {d.notes.replace(/^Từ chối: /, '')}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[d.status]}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    {proofLink && (
                      <a href={proofLink} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-60">
                        Xem phiếu
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Success state */}
      {step === 'done' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-bold text-green-800">✅ Đã gửi phiếu đặt cọc!</p>
          <p className="mt-1 text-sm text-green-700">Mã yêu cầu: <span className="font-mono font-bold">{txnNumber}</span></p>
          <p className="mt-1 text-sm text-green-700">Japan VIP sẽ xác nhận trong <strong>1–2 giờ làm việc</strong> (08:00–18:30).</p>
          <button onClick={() => setStep('info')} className="mt-3 text-sm text-green-700 underline">Gửi yêu cầu khác</button>
        </div>
      )}

      {/* Bank info + CTA */}
      {step === 'info' && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">Thông tin chuyển khoản đặt cọc</p>
          <div className="mb-4 rounded-lg border bg-gray-50 px-4 py-3 space-y-1.5">
            {[
              { label: 'Ngân hàng', value: bankInfo.bankName },
              { label: 'Số tài khoản', value: bankInfo.stk, mono: true },
              { label: 'Chủ tài khoản', value: bankInfo.owner },
              { label: 'Nội dung CK', value: contentCode, mono: true, highlight: true },
            ].map(({ label, value, mono, highlight }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-semibold ${mono ? 'font-mono' : ''} ${highlight ? 'text-brand-red' : 'text-gray-800'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p className="mb-4 text-xs text-gray-400">
            Ghi đúng nội dung chuyển khoản để Japan VIP xác nhận nhanh hơn. Sau khi chuyển khoản, bấm nút bên dưới để gửi phiếu.
          </p>
          {hasApproved ? (
            <div className="rounded-xl bg-green-50 border border-green-200 py-3 text-center">
              <p className="text-sm font-semibold text-green-700">✅ Đặt cọc đã được duyệt — Quý khách có thể tham gia đấu giá</p>
            </div>
          ) : hasPending ? (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 py-3 text-center">
              <p className="text-sm font-semibold text-yellow-700">⏳ Đang chờ Japan VIP xác nhận phiếu đặt cọc</p>
            </div>
          ) : (
            <button
              onClick={() => setStep('form')}
              className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Tôi đã chuyển khoản — Gửi phiếu đặt cọc
            </button>
          )}
        </div>
      )}

      {/* Upload form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="rounded-xl border-2 border-brand-red/20 bg-red-50/30 p-5 space-y-4">
          <p className="font-bold text-gray-800">Gửi phiếu xác nhận đặt cọc</p>

          {/* Proof image upload */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Ảnh phiếu chuyển khoản <span className="font-normal text-gray-400">(khuyến khích)</span>
            </label>
            {proofPreview ? (
              <div className="relative w-full max-w-xs">
                <Image src={proofPreview} alt="Phiếu CK" width={320} height={200} className="rounded-xl object-cover border" unoptimized />
                <button
                  type="button"
                  onClick={() => { setProofUrl(''); setProofPreview('') }}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-brand-red hover:text-brand-red transition disabled:opacity-50"
              >
                {uploading ? '⏳ Đang tải lên...' : '📎 Chọn ảnh phiếu chuyển khoản'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Số tiền đã chuyển <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">₫</span>
            </div>
            {amount && parseInt(amount.replace(/\D/g, '')) >= 100_000 && (
              <p className="mt-1 text-xs text-green-600">= {formatVND(parseInt(amount.replace(/\D/g, '')))}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Mã giao dịch ngân hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: FT26161234567"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <p className="mt-1 text-xs text-gray-400">Mã này xuất hiện trên biên lai / tin nhắn SMS của ngân hàng</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Ghi chú thêm</label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Chuyển lúc 9:30 sáng ngày 16/6"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          {error && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('info'); setError('') }}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition"
            >
              {loading ? 'Đang gửi...' : 'Gửi phiếu đặt cọc'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
