'use client'

import { useState, useRef } from 'react'
import { Copy, CheckCircle, Clock, XCircle, DollarSign, Link2, Landmark, Pencil, IdCard } from 'lucide-react'

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
  idCardNumber: string | null
  idCardFront: string | null
  idCardBack: string | null
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

  const hasBank = Boolean(partner.bankAccount)
  const [editingBank, setEditingBank] = useState(false)
  const [bank, setBank] = useState({
    bankName: partner.bankName ?? '',
    bankAccount: partner.bankAccount ?? '',
    bankHolder: partner.bankHolder ?? '',
  })
  const [savedBank, setSavedBank] = useState({
    bankName: partner.bankName ?? '',
    bankAccount: partner.bankAccount ?? '',
    bankHolder: partner.bankHolder ?? '',
  })
  const [savingBank, setSavingBank] = useState(false)
  const [bankError, setBankError] = useState('')

  const hasIdCard = Boolean(partner.idCardFront && partner.idCardBack)
  const [editingId, setEditingId] = useState(false)
  const [idCard, setIdCard] = useState({
    idCardNumber: partner.idCardNumber ?? '',
    idCardFront: partner.idCardFront ?? '',
    idCardBack: partner.idCardBack ?? '',
  })
  const [savedIdCard, setSavedIdCard] = useState({
    idCardNumber: partner.idCardNumber ?? '',
    idCardFront: partner.idCardFront ?? '',
    idCardBack: partner.idCardBack ?? '',
  })
  const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null)
  const [savingId, setSavingId] = useState(false)
  const [idError, setIdError] = useState('')
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  async function uploadIdImage(side: 'front' | 'back', file: File) {
    setIdError('')
    setUploadingSide(side)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/v1/partner/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setIdCard((c) => ({ ...c, [side === 'front' ? 'idCardFront' : 'idCardBack']: data.data.publicUrl }))
      } else {
        setIdError(data.error ?? 'Upload thất bại')
      }
    } catch {
      setIdError('Không kết nối được. Vui lòng thử lại.')
    } finally {
      setUploadingSide(null)
    }
  }

  async function saveIdCard() {
    setIdError('')
    if (!idCard.idCardNumber || !idCard.idCardFront || !idCard.idCardBack) {
      setIdError('Vui lòng nhập số CCCD và tải lên ảnh mặt trước + mặt sau')
      return
    }
    setSavingId(true)
    try {
      const res = await fetch('/api/v1/partner/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idCard),
      })
      const data = await res.json()
      if (data.success) {
        setSavedIdCard({ ...idCard })
        setEditingId(false)
      } else {
        setIdError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setIdError('Không kết nối được. Vui lòng thử lại.')
    } finally {
      setSavingId(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveBank() {
    setBankError('')
    if (!bank.bankName || !bank.bankAccount || !bank.bankHolder) {
      setBankError('Vui lòng điền đầy đủ thông tin ngân hàng')
      return
    }
    setSavingBank(true)
    try {
      const res = await fetch('/api/v1/partner/bank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bank),
      })
      const data = await res.json()
      if (data.success) {
        setSavedBank({ ...bank, bankHolder: bank.bankHolder.toUpperCase() })
        setEditingBank(false)
      } else {
        setBankError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setBankError('Không kết nối được. Vui lòng thử lại.')
    } finally {
      setSavingBank(false)
    }
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
        <div className="mt-3">
          <div className="inline-block rounded-lg bg-gray-50 border px-3 py-2 text-xs">
            <span className="text-gray-500">Mã của bạn:</span>{' '}
            <strong className="font-mono text-gray-900">{partner.refCode}</strong>
          </div>
        </div>
      </div>

      {/* Bank info */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-red-600" />
            <h2 className="font-semibold text-gray-900">Thông tin nhận tiền</h2>
          </div>
          {hasBank && !editingBank && (
            <button
              onClick={() => { setBank(savedBank); setEditingBank(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
            </button>
          )}
        </div>

        {!hasBank && !editingBank && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
            <p className="text-sm text-amber-800">
              Bạn chưa cập nhật tài khoản ngân hàng. Hãy bổ sung để Japan VIP có thể chuyển hoa hồng cho bạn.
            </p>
            <button
              onClick={() => setEditingBank(true)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              + Thêm tài khoản ngân hàng
            </button>
          </div>
        )}

        {hasBank && !editingBank && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 border px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Ngân hàng</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{savedBank.bankName}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Số tài khoản</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900">{savedBank.bankAccount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Chủ tài khoản</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{savedBank.bankHolder}</p>
            </div>
          </div>
        )}

        {editingBank && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Ngân hàng</label>
              <input
                type="text"
                value={bank.bankName}
                onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}
                placeholder="Vietcombank / Techcombank / MB Bank..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Số tài khoản</label>
              <input
                type="text"
                value={bank.bankAccount}
                onChange={(e) => setBank((b) => ({ ...b, bankAccount: e.target.value.replace(/\D/g, '') }))}
                placeholder="Số tài khoản ngân hàng"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Chủ tài khoản</label>
              <input
                type="text"
                value={bank.bankHolder}
                onChange={(e) => setBank((b) => ({ ...b, bankHolder: e.target.value }))}
                placeholder="Tên chủ tài khoản (viết hoa)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            {bankError && <p className="text-sm text-red-600">⚠️ {bankError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveBank}
                disabled={savingBank}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {savingBank ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
              {hasBank && (
                <button
                  onClick={() => { setEditingBank(false); setBankError('') }}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ID card (CCCD) */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-red-600" />
            <h2 className="font-semibold text-gray-900">Hồ sơ định danh (CCCD)</h2>
          </div>
          {hasIdCard && !editingId && (
            <button
              onClick={() => { setIdCard(savedIdCard); setEditingId(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Cập nhật
            </button>
          )}
        </div>

        {!hasIdCard && !editingId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
            <p className="text-sm text-amber-800">
              Để được duyệt làm cộng tác viên, vui lòng cung cấp CCCD để Japan VIP xác minh danh tính.
            </p>
            <button
              onClick={() => setEditingId(true)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              + Cung cấp CCCD
            </button>
          </div>
        )}

        {hasIdCard && !editingId && (
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 border px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Số CCCD</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900">{savedIdCard.idCardNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['idCardFront', 'idCardBack'] as const).map((side, i) => (
                <a key={side} href={savedIdCard[side]} target="_blank" rel="noopener noreferrer" className="group block">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">{i === 0 ? 'Mặt trước' : 'Mặt sau'}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={savedIdCard[side]} alt={i === 0 ? 'CCCD mặt trước' : 'CCCD mặt sau'} className="h-28 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-90" />
                </a>
              ))}
            </div>
          </div>
        )}

        {editingId && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Số CCCD</label>
              <input
                type="text"
                value={idCard.idCardNumber}
                onChange={(e) => setIdCard((c) => ({ ...c, idCardNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="Số căn cước công dân"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['front', 'back'] as const).map((side) => {
                const url = side === 'front' ? idCard.idCardFront : idCard.idCardBack
                const ref = side === 'front' ? frontRef : backRef
                return (
                  <div key={side}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{side === 'front' ? 'Mặt trước' : 'Mặt sau'}</label>
                    <button
                      type="button"
                      onClick={() => ref.current?.click()}
                      disabled={uploadingSide === side}
                      className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 hover:border-red-400 disabled:opacity-60"
                    >
                      {uploadingSide === side ? (
                        'Đang tải...'
                      ) : url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={side} className="h-full w-full object-cover" />
                      ) : (
                        '📷 Tải ảnh lên'
                      )}
                    </button>
                    <input
                      ref={ref}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIdImage(side, f) }}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400">Ảnh chụp rõ nét, đầy đủ 4 góc. Thông tin được bảo mật, chỉ dùng để xác minh.</p>
            {idError && <p className="text-sm text-red-600">⚠️ {idError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveIdCard}
                disabled={savingId}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {savingId ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </button>
              {hasIdCard && (
                <button
                  onClick={() => { setEditingId(false); setIdError('') }}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        )}
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
