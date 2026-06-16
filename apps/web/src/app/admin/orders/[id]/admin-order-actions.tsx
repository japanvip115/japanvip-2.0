'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BFJ_STATUS_LABELS } from '@/lib/bfj-status'
import type { BfjOrderStatus } from '@japanvip/db'

const STATUS_FLOW: BfjOrderStatus[] = [
  'PENDING_REVIEW', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED',
  'ORDERING', 'ORDERED_FROM_JAPAN', 'IN_TRANSIT_JP',
  'CUSTOMS_CLEARANCE', 'IN_TRANSIT_VN', 'DELIVERED',
]

const STATUS_COLORS: Partial<Record<BfjOrderStatus, string>> = {
  PENDING_REVIEW:    'text-yellow-400',
  AWAITING_DEPOSIT:  'text-orange-400',
  DEPOSIT_RECEIVED:  'text-blue-400',
  ORDERING:          'text-blue-400',
  ORDERED_FROM_JAPAN:'text-cyan-400',
  IN_TRANSIT_JP:     'text-purple-400',
  CUSTOMS_CLEARANCE: 'text-purple-400',
  IN_TRANSIT_VN:     'text-indigo-400',
  DELIVERED:         'text-green-400',
  CANCELLED:         'text-red-400',
  REFUNDED:          'text-gray-400',
}

const INPUT = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition-colors'

function fmt(val: string) {
  const n = Number(val.replace(/\D/g, ''))
  return n ? n.toLocaleString('vi-VN') : ''
}

type OrderSnippet = {
  id: string
  status: BfjOrderStatus
  adminNotes: string | null
  trackingJp: string | null
  trackingVn: string | null
  estimatedVnd: number | null
  depositAmount: number | null
  finalVnd: number | null
}

type Tab = 'finance' | 'shipping' | 'notes'

export function AdminOrderActions({ order }: { order: OrderSnippet }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('finance')
  const [status, setStatus] = useState<BfjOrderStatus>(order.status)
  const [estimatedVnd, setEstimatedVnd] = useState(order.estimatedVnd ? String(order.estimatedVnd) : '')
  const [depositAmount, setDepositAmount] = useState(order.depositAmount ? String(order.depositAmount) : '')
  const [finalVnd, setFinalVnd] = useState(order.finalVnd ? String(order.finalVnd) : '')
  const [trackingJp, setTrackingJp] = useState(order.trackingJp ?? '')
  const [trackingVn, setTrackingVn] = useState(order.trackingVn ?? '')
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // inputs: raw digits while focused, formatted on blur
  const [focusedField, setFocusedField] = useState<string | null>(null)

  function numInput(field: string, val: string, setter: (v: string) => void) {
    return {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      value: focusedField === field ? val : (val ? fmt(val) : ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setter(e.target.value.replace(/\D/g, '')); setSaved(false) },
      onFocus: () => setFocusedField(field),
      onBlur: () => setFocusedField(null),
    }
  }

  const FINAL_STATUSES: BfjOrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED']
  const FINAL_LABELS: Partial<Record<BfjOrderStatus, string>> = {
    DELIVERED: 'Đã giao hàng — không thể hoàn tác. Xác nhận?',
    CANCELLED: 'Huỷ đơn hàng — không thể hoàn tác. Xác nhận?',
    REFUNDED: 'Hoàn tiền — không thể hoàn tác. Xác nhận?',
  }

  async function handleSave() {
    if (status !== order.status && FINAL_STATUSES.includes(status)) {
      if (!window.confirm(FINAL_LABELS[status])) return
    }
    setSaving(true); setSaved(false); setError('')
    try {
      const res = await fetch(`/api/v1/admin/bfj-orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes || undefined,
          trackingJp: trackingJp || undefined,
          trackingVn: trackingVn || undefined,
          ...(estimatedVnd ? { estimatedVnd: Number(estimatedVnd) } : {}),
          ...(depositAmount ? { depositAmount: Number(depositAmount) } : {}),
          ...(finalVnd ? { finalVnd: Number(finalVnd) } : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => router.push('/admin/orders'), 800)
      } else setError(data.error ?? 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'finance', label: 'Tài chính' },
    { key: 'shipping', label: 'Vận chuyển' },
    { key: 'notes', label: 'Ghi chú' },
  ]

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
      {/* Status row */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700/60">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</label>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as BfjOrderStatus); setSaved(false) }}
          className={`${INPUT} font-medium ${STATUS_COLORS[status] ?? 'text-gray-100'}`}
        >
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{BFJ_STATUS_LABELS[s]}</option>
          ))}
          <option value="CANCELLED">Đã huỷ</option>
          <option value="REFUNDED">Đã hoàn tiền</option>
        </select>
        {status !== order.status && (
          <p className={`mt-1.5 text-xs ${FINAL_STATUSES.includes(status) ? 'text-red-400 font-semibold' : 'text-orange-400'}`}>
            {FINAL_STATUSES.includes(status)
              ? '⛔ Trạng thái cuối — không thể hoàn tác sau khi lưu'
              : '⚠ Sẽ gửi thông báo cho khách'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'border-b-2 border-red-500 text-red-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'finance' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Giá ước tính</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                  <input {...numInput('est', estimatedVnd, setEstimatedVnd)} placeholder="0" className={`${INPUT} pl-6 text-xs`} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-gray-500">Tiền cọc</label>
                  {estimatedVnd && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(Math.round(Number(estimatedVnd) * 0.3)))}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      30% auto
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                  <input {...numInput('dep', depositAmount, setDepositAmount)} placeholder="0" className={`${INPUT} pl-6 text-xs`} />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Giá cuối (sau khi chốt)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-600">₫</span>
                <input {...numInput('fin', finalVnd, setFinalVnd)} placeholder="0" className={`${INPUT} pl-6 text-xs`} />
              </div>
            </div>

            {(estimatedVnd || depositAmount || finalVnd) && (
              <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-1.5">
                {estimatedVnd && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Ước tính</span>
                    <span className="text-gray-200">{Number(estimatedVnd).toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}
                {depositAmount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Đặt cọc</span>
                    <span className="font-semibold text-orange-400">{Number(depositAmount).toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}
                {finalVnd && (
                  <div className="flex justify-between text-xs border-t border-gray-700 pt-1.5">
                    <span className="text-gray-400 font-medium">Giá cuối</span>
                    <span className="font-bold text-red-400">{Number(finalVnd).toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'shipping' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Mã vận đơn Nhật</label>
              <input
                value={trackingJp}
                onChange={(e) => { setTrackingJp(e.target.value); setSaved(false) }}
                placeholder="JD123456789JP"
                className={`${INPUT} font-mono text-xs`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Mã vận đơn VN</label>
              <input
                value={trackingVn}
                onChange={(e) => { setTrackingVn(e.target.value); setSaved(false) }}
                placeholder="VN123456789"
                className={`${INPUT} font-mono text-xs`}
              />
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <textarea
            value={adminNotes}
            onChange={(e) => { setAdminNotes(e.target.value); setSaved(false) }}
            rows={5}
            placeholder="Ghi chú nội bộ, không hiển thị cho khách..."
            className={`${INPUT} resize-none text-xs leading-relaxed`}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-2">
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">❌ {error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Đang lưu...
              </span>
            : saved ? '✓ Đã lưu' : 'Lưu thay đổi'
          }
        </button>
      </div>
    </div>
  )
}
