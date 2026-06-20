'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Clock, XCircle, DollarSign, Link2 } from 'lucide-react'

type Commission = {
  id: string
  orderRef: string
  productName: string
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  status: string
  createdAt: string
  paidAt: string | null
}

type Partner = {
  refCode: string
  defaultCommissionRate: number
  totalEarned: number
  totalPaid: number
  status: string
  bankName: string | null
  bankAccount: string | null
  bankHolder: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  PAID: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-700', icon: DollarSign },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700', icon: XCircle },
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export function PartnerCommissionsClient({
  partner,
  commissions,
  stats,
  appUrl,
}: {
  partner: Partner
  commissions: Commission[]
  stats: { pending: number; approved: number; paid: number; total: number }
  appUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const refLink = `${appUrl}?ref=${partner.refCode}`

  function copyLink() {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hoa Hồng Của Tôi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tỷ lệ hoa hồng hiện tại: <strong className="text-red-600">{(partner.defaultCommissionRate * 100).toFixed(0)}%</strong> trên giá trị đơn hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Chờ duyệt', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Đã duyệt', value: stats.approved, color: 'text-blue-600' },
          { label: 'Đã nhận', value: stats.paid, color: 'text-green-600' },
          { label: 'Tổng tích lũy', value: stats.total, color: 'text-gray-900' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-red-600" />
          <h2 className="font-semibold text-gray-900">Link giới thiệu của bạn</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Chia sẻ link này cho khách hàng. Khi họ đặt hàng, bạn tự động nhận hoa hồng <strong>{(partner.defaultCommissionRate * 100).toFixed(0)}%</strong>.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-700 truncate">
            {refLink}
          </div>
          <button
            onClick={copyLink}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              copied ? 'bg-green-500 text-white' : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {copied ? <><CheckCircle className="h-4 w-4" /> Đã copy</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="rounded-lg bg-gray-50 border px-3 py-2 text-xs">
            <span className="text-gray-500">Mã của bạn:</span>{' '}
            <strong className="font-mono text-gray-900">{partner.refCode}</strong>
          </div>
          {partner.bankAccount && (
            <div className="rounded-lg bg-gray-50 border px-3 py-2 text-xs">
              <span className="text-gray-500">Nhận tiền:</span>{' '}
              <strong className="text-gray-900">{partner.bankName} — {partner.bankAccount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Commission list */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">Lịch sử hoa hồng</h2>
        </div>
        {commissions.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Chưa có hoa hồng nào — hãy chia sẻ link để bắt đầu kiếm tiền!
          </div>
        ) : (
          <div className="divide-y">
            {commissions.map((c) => {
              const cfg = (STATUS_CONFIG[c.status] ?? STATUS_CONFIG['PENDING'])!
              const Icon = cfg.icon
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.productName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Đơn <span className="font-mono">{c.orderRef}</span> · {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Giá trị đơn: {fmt(c.orderAmount)} · Tỷ lệ: {(c.commissionRate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-green-600">+{fmt(c.commissionAmount)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
