'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole, UserStatus } from '@japanvip/db'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'PARTNER', label: 'Đối tác' },
  { value: 'ADMIN', label: 'Admin' },
]

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'SUSPENDED', label: 'Đình chỉ' },
  { value: 'PENDING_VERIFY', label: 'Chờ xác minh' },
]

export function UserActions({
  userId,
  currentRole,
  currentStatus,
}: {
  userId: string
  currentRole: UserRole
  currentStatus: UserStatus
}) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(currentRole)
  const [status, setStatus] = useState<UserStatus>(currentStatus)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const hasChanges = role !== currentRole || status !== currentStatus
  const canDelete = currentRole !== 'SUPER_ADMIN'

  async function handleDelete() {
    if (!confirm('Xoá người dùng này? Tài khoản sẽ bị ẩn khỏi danh sách và đình chỉ (giữ lịch sử đơn hàng/đấu giá, có thể khôi phục sau).')) return
    setDeleting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        router.push('/admin/users')
        router.refresh()
      } else {
        setError(data.error ?? 'Không thể xoá người dùng')
        setDeleting(false)
      }
    } catch {
      setError('Không thể kết nối')
      setDeleting(false)
    }
  }

  async function handleSave() {
    if (!confirm('Xác nhận thay đổi thông tin người dùng?')) return
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, status }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Đã cập nhật thành công')
        router.refresh()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không thể kết nối')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40 cursor-pointer"
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting || saving}
          className="rounded-lg border border-red-600/60 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40 cursor-pointer"
        >
          {deleting ? 'Đang xoá...' : '🗑 Xoá người dùng'}
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}
    </div>
  )
}
