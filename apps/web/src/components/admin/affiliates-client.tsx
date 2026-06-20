'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, DollarSign, Users, Gift } from 'lucide-react'

type Partner = {
  id: string; refCode: string; status: string
  defaultCommissionRate: number; totalEarned: number; totalPaid: number
  createdAt: string; approvedAt: string | null
  email: string; fullName: string | null; phone: string | null
  bankName: string | null; bankAccount: string | null; bankHolder: string | null
  pendingAmount: number; approvedAmount: number
}

type Commission = {
  id: string; orderRef: string; productName: string
  orderAmount: number; commissionRate: number; commissionAmount: number
  status: string; createdAt: string; paidAt: string | null
  partnerRefCode: string; partnerName: string
  bankName: string | null; bankAccount: string | null; bankHolder: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PAID: 'Đã trả', REJECTED: 'Từ chối',
}

function fmt(n: number) { return n.toLocaleString('vi-VN') + '₫' }

const cardCls = 'rounded-xl border border-gray-700 bg-gray-800/60 p-5'

export function AdminAffiliatesClient({ partners, commissions }: { partners: Partner[]; commissions: Commission[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'partners' | 'commissions'>('commissions')
  const [loading, setLoading] = useState<string | null>(null)

  async function partnerAction(partnerId: string, action: string) {
    setLoading(partnerId + action)
    await fetch('/api/v1/admin/affiliates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerId, action }) })
    setLoading(null)
    router.refresh()
  }

  async function commissionAction(commissionId: string, action: string) {
    setLoading(commissionId + action)
    await fetch(`/api/v1/admin/affiliates/${commissionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    setLoading(null)
    router.refresh()
  }

  const pendingPartners = partners.filter((p) => p.status === 'PENDING')
  const pendingCommissions = commissions.filter((c) => c.status === 'PENDING')
  const approvedCommissions = commissions.filter((c) => c.status === 'APPROVED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Quản Lý Hoa Hồng</h1>
        <p className="text-sm text-gray-500 mt-1">Duyệt đơn đăng ký, quản lý và thanh toán hoa hồng cho cộng tác viên</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Đang chờ duyệt', value: pendingPartners.length + ' người', color: 'text-yellow-400', icon: Users },
          { label: 'HH chờ duyệt', value: fmt(pendingCommissions.reduce((s, c) => s + c.commissionAmount, 0)), color: 'text-yellow-400', icon: Clock },
          { label: 'HH chờ thanh toán', value: fmt(approvedCommissions.reduce((s, c) => s + c.commissionAmount, 0)), color: 'text-blue-400', icon: Gift },
          { label: 'Tổng CTV hoạt động', value: partners.filter((p) => p.status === 'APPROVED').length + ' người', color: 'text-green-400', icon: CheckCircle },
        ].map((s) => (
          <div key={s.label} className={cardCls}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800/40 p-1 w-fit">
        {[
          { key: 'commissions', label: `Hoa hồng (${commissions.length})` },
          { key: 'partners', label: `Cộng tác viên (${partners.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* COMMISSIONS TAB */}
      {tab === 'commissions' && (
        <div className={`${cardCls} overflow-hidden p-0`}>
          <div className="border-b border-gray-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-200">Hoa hồng cần xử lý</h2>
          </div>
          {commissions.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Không có hoa hồng nào cần xử lý</p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{c.orderRef}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-100 truncate">{c.productName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      CTV: <strong className="text-gray-300">{c.partnerName}</strong> · Mã: <span className="font-mono text-red-400">{c.partnerRefCode}</span>
                    </p>
                    {c.bankAccount && (
                      <p className="text-xs text-gray-500">
                        STK: {c.bankName} — {c.bankAccount} — {c.bankHolder}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Giá trị đơn</p>
                      <p className="text-sm text-gray-300">{fmt(c.orderAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hoa hồng ({(c.commissionRate * 100).toFixed(0)}%)</p>
                      <p className="text-lg font-bold text-green-400">+{fmt(c.commissionAmount)}</p>
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      {c.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => commissionAction(c.id, 'approve')}
                            disabled={!!loading}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
                          >
                            {loading === c.id + 'approve' ? '...' : 'Duyệt'}
                          </button>
                          <button
                            onClick={() => commissionAction(c.id, 'reject')}
                            disabled={!!loading}
                            className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                          >
                            {loading === c.id + 'reject' ? '...' : 'Từ chối'}
                          </button>
                        </>
                      )}
                      {c.status === 'APPROVED' && (
                        <button
                          onClick={() => commissionAction(c.id, 'pay')}
                          disabled={!!loading}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {loading === c.id + 'pay' ? '...' : '💸 Đã trả'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PARTNERS TAB */}
      {tab === 'partners' && (
        <div className={`${cardCls} overflow-hidden p-0`}>
          <div className="border-b border-gray-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-200">Danh sách cộng tác viên</h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {partners.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : p.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.status === 'APPROVED' ? 'Hoạt động' : p.status === 'PENDING' ? 'Chờ duyệt' : 'Tạm dừng'}
                    </span>
                    <span className="font-mono text-sm font-bold text-red-400">{p.refCode}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-100">{p.fullName ?? p.email}</p>
                  <p className="text-xs text-gray-500">{p.email} · {p.phone}</p>
                  {p.bankAccount && (
                    <p className="text-xs text-gray-600">{p.bankName} — {p.bankAccount}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    HH: <span className="text-yellow-400">{fmt(p.pendingAmount)} chờ</span> · <span className="text-blue-400">{fmt(p.approvedAmount)} duyệt</span> · <span className="text-green-400">{fmt(p.totalPaid)} đã trả</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-2">
                  <p className="text-xs text-gray-500">Tỷ lệ HH</p>
                  <p className="text-lg font-bold text-gray-200">{(p.defaultCommissionRate * 100).toFixed(0)}%</p>
                  <div className="flex gap-1.5 justify-end">
                    {p.status === 'PENDING' && (
                      <button
                        onClick={() => partnerAction(p.id, 'approve')}
                        disabled={!!loading}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        {loading === p.id + 'approve' ? '...' : 'Duyệt'}
                      </button>
                    )}
                    {p.status === 'APPROVED' && (
                      <button
                        onClick={() => partnerAction(p.id, 'suspend')}
                        disabled={!!loading}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-yellow-500 hover:text-yellow-400 disabled:opacity-50"
                      >
                        Tạm dừng
                      </button>
                    )}
                    {p.status === 'SUSPENDED' && (
                      <button
                        onClick={() => partnerAction(p.id, 'approve')}
                        disabled={!!loading}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        Kích hoạt lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
