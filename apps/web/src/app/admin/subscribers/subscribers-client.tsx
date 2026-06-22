'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Upload, Download, Plus, Trash2, UserCheck, UserX, RefreshCw, Mail } from 'lucide-react'

type Subscriber = {
  id: number
  email: string
  name: string | null
  phone: string | null
  city: string | null
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED'
  source: string | null
  createdAt: string
}

type ApiResponse = {
  items: Subscriber[]
  total: number
  page: number
  totalPages: number
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Đang nhận', cls: 'bg-green-500/15 text-green-400' },
  UNSUBSCRIBED: { label: 'Hủy đăng ký', cls: 'bg-gray-500/15 text-gray-400' },
  BOUNCED: { label: 'Lỗi email', cls: 'bg-red-500/15 text-red-400' },
}

export function SubscribersClient() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Add modal state
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', name: '', phone: '', city: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // Công tắc tổng email tự động/hàng loạt (chặn welcome/newsletter/win-back... khi test/lỗi)
  const [autoSend, setAutoSend] = useState<boolean | null>(null)
  const [togglingAutoSend, setTogglingAutoSend] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/settings/email-auto-send')
      .then((r) => r.json())
      .then((j) => { if (j.success) setAutoSend(j.data.enabled) })
      .catch(() => {})
  }, [])

  async function toggleAutoSend() {
    if (autoSend === null || togglingAutoSend) return
    const next = !autoSend
    if (next && !confirm('Bật lại GỬI EMAIL TỰ ĐỘNG? Hệ thống sẽ được phép gửi welcome/newsletter/win-back... cho subscriber.')) return
    setTogglingAutoSend(true)
    try {
      const res = await fetch('/api/v1/admin/settings/email-auto-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const j = await res.json()
      if (j.success) setAutoSend(j.data.enabled)
    } finally {
      setTogglingAutoSend(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ page: String(page) })
      if (q) sp.set('q', q)
      if (status) sp.set('status', status)
      const res = await fetch(`/api/v1/admin/subscribers?${sp}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [page, q, status])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset to page 1 on search/filter change
  useEffect(() => { setPage(1) }, [q, status])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/v1/admin/subscribers/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setImportResult(json.data)
        fetchData()
      } else {
        alert(json.message || 'Import thất bại')
      }
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: number, email: string) {
    if (!confirm(`Xóa ${email} khỏi danh sách?`)) return
    await fetch(`/api/v1/admin/subscribers/${id}`, { method: 'DELETE' })
    fetchData()
  }

  async function handleStatusChange(id: number, newStatus: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED') {
    await fetch(`/api/v1/admin/subscribers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchData()
  }

  async function handleAdd() {
    setAddError('')
    if (!addForm.email) { setAddError('Email không được để trống'); return }
    setAddLoading(true)
    try {
      const res = await fetch('/api/v1/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, source: 'manual' }),
      })
      const json = await res.json()
      if (json.success) {
        setShowAdd(false)
        setAddForm({ email: '', name: '', phone: '', city: '' })
        fetchData()
      } else {
        setAddError(json.message || 'Lỗi')
      }
    } finally {
      setAddLoading(false)
    }
  }

  const totalActive = data?.items.filter(s => s.status === 'ACTIVE').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Danh Sách Subscriber</h1>
          <p className="text-sm text-gray-400 mt-1">
            {data ? `${data.total.toLocaleString()} người đăng ký` : 'Đang tải...'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/api/v1/admin/subscribers/export"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Đang import...' : 'Import Excel / CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e60012] hover:bg-red-600 text-white text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm thủ công
          </button>
        </div>
      </div>

      {/* Công tắc tổng email tự động/hàng loạt */}
      {autoSend !== null && (
        <div
          className={`rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap ${
            autoSend
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/40 bg-red-500/15'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">{autoSend ? '📧' : '🔴'}</span>
            <div>
              <p className={`text-sm font-bold ${autoSend ? 'text-green-300' : 'text-red-300'}`}>
                {autoSend ? 'Email tự động: ĐANG BẬT' : 'Email tự động: ĐÃ TẮT (an toàn)'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
                {autoSend
                  ? 'Hệ thống được phép tự gửi welcome / newsletter / win-back / digest cho subscriber. Tắt khi đang test hoặc nghi lỗi để tránh gửi nhầm hàng loạt.'
                  : 'Mọi email tự động/hàng loạt đang bị chặn — an toàn để test. (OTP đăng nhập & xác nhận đơn vẫn chạy bình thường.)'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAutoSend}
            disabled={togglingAutoSend}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              autoSend ? 'bg-green-500' : 'bg-gray-600'
            }`}
            aria-label="Bật/tắt email tự động"
            title={autoSend ? 'Tắt email tự động' : 'Bật email tự động'}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                autoSend ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Import result banner */}
      {importResult && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300 flex items-start justify-between gap-4">
          <div>
            <span className="font-semibold">Import thành công!</span>{' '}
            Đã thêm <span className="font-bold text-green-200">{importResult.imported.toLocaleString()}</span> subscriber mới.
            {importResult.skipped > 0 && (
              <span className="text-gray-400"> Bỏ qua {importResult.skipped.toLocaleString()} email trùng.</span>
            )}
          </div>
          <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tìm email, tên, số điện thoại..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang nhận</option>
          <option value="UNSUBSCRIBED">Hủy đăng ký</option>
          <option value="BOUNCED">Lỗi email</option>
        </select>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng subscriber', value: data?.total ?? '—', icon: Mail, color: 'text-blue-400' },
          { label: 'Đang nhận email', value: data ? data.items.filter(s => s.status === 'ACTIVE').length : '—', icon: UserCheck, color: 'text-green-400', note: '(trang này)' },
          { label: 'Hủy / Lỗi', value: data ? data.items.filter(s => s.status !== 'ACTIVE').length : '—', icon: UserX, color: 'text-red-400', note: '(trang này)' },
        ].map(({ label, value, icon: Icon, color, note }) => (
          <div key={label} className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex items-center gap-3">
            <Icon className={`w-8 h-8 ${color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              <p className="text-xs text-gray-400">{label} {note && <span className="text-gray-600">{note}</span>}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">SĐT</th>
                <th className="px-4 py-3 text-left">Tỉnh/TP</th>
                <th className="px-4 py-3 text-left">Nguồn</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Ngày thêm</th>
                <th className="px-4 py-3 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500">Đang tải...</td></tr>
              ) : !data?.items.length ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500">Chưa có subscriber nào</td></tr>
              ) : data.items.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-4 py-3 text-blue-300 font-mono text-xs">{sub.email}</td>
                  <td className="px-4 py-3 text-gray-200">{sub.name || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-gray-300">{sub.phone || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-gray-300">{sub.city || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs rounded px-2 py-0.5 bg-gray-800 text-gray-400">{sub.source || 'manual'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={sub.status}
                      onChange={e => handleStatusChange(sub.id, e.target.value as any)}
                      className={`text-xs rounded px-2 py-1 border-0 cursor-pointer focus:outline-none ${STATUS_LABEL[sub.status]?.cls ?? ''} bg-transparent`}
                    >
                      <option value="ACTIVE">Đang nhận</option>
                      <option value="UNSUBSCRIBED">Hủy đăng ký</option>
                      <option value="BOUNCED">Lỗi email</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(sub.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(sub.id, sub.email)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800 text-sm text-gray-400">
            <span>Trang {data.page}/{data.totalPages} · {data.total.toLocaleString()} subscriber</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white transition-colors">
                ← Trước
              </button>
              <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white transition-colors">
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Thêm Subscriber Thủ Công</h2>
            {addError && <p className="text-sm text-red-400 bg-red-500/10 rounded p-2">{addError}</p>}
            {[
              { key: 'email', label: 'Email *', type: 'email', placeholder: 'khachhang@gmail.com' },
              { key: 'name', label: 'Tên', type: 'text', placeholder: 'Nguyễn Văn A' },
              { key: 'phone', label: 'Số điện thoại', type: 'text', placeholder: '0912345678' },
              { key: 'city', label: 'Tỉnh/Thành phố', type: 'text', placeholder: 'Hà Nội' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={addForm[key as keyof typeof addForm]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm transition-colors">
                Hủy
              </button>
              <button onClick={handleAdd} disabled={addLoading} className="flex-1 py-2 rounded-lg bg-[#e60012] hover:bg-red-600 text-white text-sm transition-colors disabled:opacity-50">
                {addLoading ? 'Đang thêm...' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
