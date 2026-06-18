'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QuickOrderStatus } from '@japanvip/db'

const STATUS_LABELS: Record<QuickOrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONTACTED: 'Đã liên hệ',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

const ALL_STATUSES: QuickOrderStatus[] = ['PENDING', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export function QuickOrderActions({
  id,
  status,
  adminNotes,
}: {
  id: string
  status: QuickOrderStatus
  adminNotes: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<QuickOrderStatus>(status)
  const [notes, setNotes] = useState(adminNotes ?? '')
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch(`/api/v1/admin/quick-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, adminNotes: notes }),
      })
      if (res.ok) {
        setMsg('Đã lưu thành công!')
        router.refresh()
      } else {
        setMsg('Lưu thất bại, thử lại.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Trạng thái</label>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as QuickOrderStatus)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
        >
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Ghi chú admin</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Ghi chú nội bộ..."
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none resize-none"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
      >
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>

      {msg && <p className="text-center text-xs text-green-400">{msg}</p>}
    </div>
  )
}
