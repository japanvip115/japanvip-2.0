'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuctionStatus } from '@japanvip/db'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'

const ALLOWED_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
  SETTLED: [],
}

type Props = {
  auctionId: string
  currentStatus: AuctionStatus
  createdBy: string
  createdAt: string
}

export function AdminAuctionActions({ auctionId, currentStatus, createdBy, createdAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmStatus, setConfirmStatus] = useState<AuctionStatus | null>(null)

  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []

  const ACTION_LABELS: Partial<Record<AuctionStatus, { label: string; style: string }>> = {
    SCHEDULED: { label: 'Lên lịch (SCHEDULED)', style: 'rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer' },
    LIVE: { label: '▶ Kích hoạt LIVE', style: 'rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 cursor-pointer' },
    ENDED: { label: '⏹ Kết thúc ngay', style: 'rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer' },
    CANCELLED: { label: '✕ Hủy phiên', style: 'rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/40 cursor-pointer' },
  }

  async function updateStatus(newStatus: AuctionStatus) {
    setLoading(true)
    setError('')
    setSuccess('')
    setConfirmStatus(null)
    try {
      const res = await fetch(`/api/v1/admin/auctions/${auctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Đã chuyển sang "${AUCTION_STATUS_LABELS[newStatus]}"`)
        router.refresh()
      } else {
        setError(data.error ?? `Lỗi ${res.status}: Không thể cập nhật trạng thái`)
      }
    } catch (err) {
      setError(`Không thể kết nối: ${err instanceof Error ? err.message : 'Vui lòng thử lại.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-200">Quản Lý Phiên</h2>

      {/* Meta */}
      <div className="mb-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Trạng thái hiện tại</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[currentStatus]}`}>
            {AUCTION_STATUS_LABELS[currentStatus]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Tạo bởi</span>
          <span className="text-right font-medium text-gray-200 max-w-[160px] truncate">{createdBy}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Ngày tạo</span>
          <span className="text-gray-300">
            {new Date(createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Transition buttons */}
      {allowed.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Chuyển trạng thái</p>
          {allowed.map((nextStatus) => {
            const action = ACTION_LABELS[nextStatus]
            if (!action) return null
            return confirmStatus === nextStatus ? (
              <div key={nextStatus} className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                <p className="mb-2 text-sm font-medium text-yellow-400">
                  Xác nhận chuyển sang "{AUCTION_STATUS_LABELS[nextStatus]}"?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(nextStatus)}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-yellow-600 py-1.5 text-xs font-bold text-white hover:bg-yellow-500 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                  <button
                    onClick={() => setConfirmStatus(null)}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={nextStatus}
                onClick={() => setConfirmStatus(nextStatus)}
                disabled={loading}
                className={`w-full transition ${action.style} disabled:opacity-60`}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          Không có thao tác khả dụng
        </p>
      )}

      {success && (
        <p className="mt-3 rounded-lg bg-green-900/20 border border-green-700/50 px-3 py-2 text-xs text-green-400">✓ {success}</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-900/20 border border-red-700/50 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {/* Notes */}
      {currentStatus === 'LIVE' && (
        <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-400">
          <p className="font-medium mb-1">Lưu ý khi kết thúc thủ công:</p>
          <p>Hệ thống sẽ tự động chọn người thắng, tạo settlement và thông báo người thắng.</p>
        </div>
      )}
    </div>
  )
}
