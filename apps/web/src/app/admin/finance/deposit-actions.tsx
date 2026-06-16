'use client'

import { useState } from 'react'

type Props = {
  txnId: string
  txnNumber: string
  amount: number
  userName: string
}

export function DepositActions({ txnId, txnNumber, amount, userName }: Props) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      const res = await fetch(`/api/v1/admin/wallet/${txnId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectReason: rejectReason || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(action === 'approve' ? 'approved' : 'rejected')
      } else {
        alert(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      alert('Không thể kết nối')
    } finally {
      setLoading(null)
    }
  }

  if (done === 'approved') {
    return <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">✓ Đã duyệt</span>
  }
  if (done === 'rejected') {
    return <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">✗ Đã từ chối</span>
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {showRejectInput ? (
        <>
          <input
            autoFocus
            type="text"
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-44 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setShowRejectInput(false)}
              className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={() => act('reject')}
              disabled={loading === 'reject'}
              className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {loading === 'reject' ? '...' : 'Từ chối'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowRejectInput(true)}
            className="rounded border border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"
          >
            Từ chối
          </button>
          <button
            onClick={() => {
              if (confirm(`Duyệt nạp ${amount.toLocaleString('vi-VN')}₫ cho ${userName}?`)) act('approve')
            }}
            disabled={loading === 'approve'}
            className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
          >
            {loading === 'approve' ? '...' : '✓ Duyệt'}
          </button>
        </div>
      )}
    </div>
  )
}
