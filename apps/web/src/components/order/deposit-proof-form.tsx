'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatVND } from '@japanvip/utils'
import { VietQRCode } from '@/components/payment/viet-qr-code'

type VietQRInfo = {
  enabled: boolean
  bankId?: string
  accountNo?: string
  accountName?: string
}

type Props = {
  orderId: string
  depositAmount: number
  alreadySubmitted: boolean
  depositSubmittedAt?: string | null
}

export function DepositProofForm({ orderId, depositAmount, alreadySubmitted, depositSubmittedAt }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(alreadySubmitted)
  const [error, setError] = useState('')
  const [vietqr, setVietqr] = useState<VietQRInfo | null>(null)

  const addInfo = `DAT COC ${orderId.slice(-8).toUpperCase()}`

  useEffect(() => {
    fetch('/api/v1/payments/vietqr-config')
      .then((r) => r.json())
      .then((d: VietQRInfo) => setVietqr(d))
      .catch(() => setVietqr({ enabled: false }))
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  async function handleSubmit() {
    if (!file) { setError('Vui lòng chọn ảnh biên lai'); return }
    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/v1/bfj/upload-proof', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upData.success) throw new Error(upData.error ?? 'Upload thất bại')

      const res = await fetch(`/api/v1/bfj/orders/${orderId}/deposit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositProofUrl: upData.data.url, depositProofNote: note || undefined }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Gửi biên lai thất bại')

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Đã gửi biên lai thành công</p>
            {depositSubmittedAt && (
              <p className="text-xs text-green-600">
                {new Date(depositSubmittedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-green-700">
          Nhân viên Japan VIP đang xác nhận biên lai. Đơn hàng sẽ được xử lý ngay sau khi xác nhận.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* VietQR hoặc fallback thông tin thủ công */}
      {vietqr?.enabled && vietqr.bankId && vietqr.accountNo ? (
        <VietQRCode
          bankId={vietqr.bankId}
          accountNo={vietqr.accountNo}
          accountName={vietqr.accountName ?? ''}
          amount={depositAmount}
          addInfo={addInfo}
        />
      ) : (
        <div className="rounded-xl border-2 border-brand-red bg-red-50 p-5">
          <p className="mb-3 text-sm font-bold text-gray-900">Chuyển khoản đặt cọc</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ngân hàng</span>
              <span className="font-semibold text-gray-900">MB Bank (MBBank)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số tài khoản</span>
              <span className="font-mono font-bold text-gray-900 select-all">0988969896</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chủ tài khoản</span>
              <span className="font-semibold text-gray-900">NGUYEN THI GIANG</span>
            </div>
            <div className="flex justify-between border-t border-red-200 pt-2 mt-2">
              <span className="text-gray-500">Nội dung CK</span>
              <span className="font-mono text-xs font-bold text-brand-red select-all">{addInfo}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white px-3 py-2 border border-red-200">
              <span className="font-semibold text-gray-700">Số tiền cọc</span>
              <span className="text-xl font-bold text-brand-red">{formatVND(depositAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload receipt */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-800">Tải lên biên lai chuyển khoản</p>

        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-brand-red hover:bg-red-50 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="Biên lai" className="mx-auto max-h-48 rounded-lg object-contain" />
          ) : (
            <>
              <div className="text-4xl mb-2">📎</div>
              <p className="text-sm font-medium text-gray-700">Chọn ảnh biên lai</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Tối đa 10MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {file && (
          <p className="mt-1.5 text-xs text-green-600 font-medium">✓ {file.name}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
          Ghi chú (tùy chọn)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Đã CK lúc 14:30 ngày 16/6"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-brand-red"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">❌ {error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={uploading || !file}
        className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {uploading ? 'Đang gửi...' : 'Gửi Biên Lai Xác Nhận Đặt Cọc'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Sau khi xác nhận, nhân viên sẽ liên hệ trong vòng 1-2 giờ
      </p>
    </div>
  )
}
