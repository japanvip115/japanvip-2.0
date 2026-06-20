'use client'

import { useState } from 'react'
import { buildVietQRUrl } from '@/lib/payments/vietqr-config'
import { formatVND } from '@japanvip/utils'

type Props = {
  bankId: string
  accountNo: string
  accountName: string
  amount?: number
  addInfo?: string
  className?: string
}

export function VietQRCode({ bankId, accountNo, accountName, amount, addInfo, className }: Props) {
  const [imgError, setImgError] = useState(false)

  if (!bankId || !accountNo) return null

  const url = buildVietQRUrl({ bankId, accountNo, accountName, amount, addInfo })

  return (
    <div className={`rounded-xl border-2 border-[#E31837] bg-white overflow-hidden ${className ?? ''}`}>
      {/* Header VietQR */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#E31837]">
        <img src="https://vietqr.io/img/vietqr_logo.svg" alt="VietQR" className="h-5 w-auto brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <span className="text-white font-bold text-sm tracking-wide">VietQR</span>
        <span className="ml-auto text-white/80 text-xs">Quét để chuyển khoản</span>
      </div>

      <div className="p-4 flex flex-col items-center gap-3">
        {imgError ? (
          <div className="w-48 h-48 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 text-xs text-center p-4">
            Không tải được QR.<br />Vui lòng chuyển khoản thủ công.
          </div>
        ) : (
          <img
            src={url}
            alt="QR chuyển khoản"
            className="w-48 h-48 object-contain rounded-lg"
            onError={() => setImgError(true)}
          />
        )}

        {/* Bank info */}
        <div className="w-full space-y-1.5 text-sm border-t pt-3">
          <Row label="Ngân hàng" value={bankId.toUpperCase()} bold />
          <Row label="Số tài khoản" value={accountNo} mono copyable />
          <Row label="Chủ tài khoản" value={accountName} bold />
          {addInfo && <Row label="Nội dung CK" value={addInfo} mono copyable highlight />}
          {amount ? (
            <div className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2 border border-red-100 mt-2">
              <span className="text-gray-600 font-medium">Số tiền</span>
              <span className="text-[#E31837] font-extrabold text-lg">{formatVND(amount)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, mono, copyable, highlight }: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
  copyable?: boolean
  highlight?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={[
            'truncate',
            bold ? 'font-semibold text-gray-900' : 'text-gray-700',
            mono ? 'font-mono' : '',
            highlight ? 'text-[#E31837] font-bold' : '',
          ].join(' ')}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
