'use client'

import { useState, useEffect } from 'react'

type AddressData = {
  label?: string | null
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  street: string
  isDefault?: boolean
}

type Props = {
  initial?: Partial<AddressData>
  onSave: (data: AddressData) => Promise<void>
  onCancel: () => void
}

export function AddressForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<AddressData>({
    label: initial?.label ?? '',
    recipientName: initial?.recipientName ?? '',
    phone: initial?.phone ?? '',
    province: initial?.province ?? '',
    district: initial?.district ?? '',
    ward: initial?.ward ?? '',
    street: initial?.street ?? '',
    isDefault: initial?.isDefault ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Tự điền Tên + SĐT từ tài khoản khi THÊM MỚI (chưa có initial) và ô còn trống
  useEffect(() => {
    if (initial?.recipientName || initial?.phone) return
    fetch('/api/v1/users/me/contact')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return
        setForm((prev) => ({
          ...prev,
          recipientName: prev.recipientName || d.data.fullName || '',
          phone: prev.phone || d.data.phone || '',
        }))
      })
      .catch(() => {})
  }, [initial?.recipientName, initial?.phone])

  const set = (k: keyof AddressData, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.recipientName || !form.phone || !form.province || !form.district || !form.ward || !form.street) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-red'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Nhãn địa chỉ <span className="font-normal text-gray-400">(tuỳ chọn, VD: Nhà, Cơ quan)</span>
          </label>
          <input
            type="text"
            value={form.label ?? ''}
            onChange={(e) => set('label', e.target.value)}
            placeholder="Nhà riêng"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Người nhận *</label>
          <input
            type="text"
            value={form.recipientName}
            onChange={(e) => set('recipientName', e.target.value)}
            placeholder="Họ và tên"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Số điện thoại *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="0988 969 896"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Tỉnh / Thành phố *</label>
          <input
            type="text"
            value={form.province}
            onChange={(e) => set('province', e.target.value)}
            placeholder="Hà Nội"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Quận / Huyện *</label>
          <input
            type="text"
            value={form.district}
            onChange={(e) => set('district', e.target.value)}
            placeholder="Cầu Giấy"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Phường / Xã *</label>
          <input
            type="text"
            value={form.ward}
            onChange={(e) => set('ward', e.target.value)}
            placeholder="Dịch Vọng"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Số nhà, tên đường *</label>
          <input
            type="text"
            value={form.street}
            onChange={(e) => set('street', e.target.value)}
            placeholder="123 Xuân Thuỷ"
            required
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault ?? false}
          onChange={(e) => set('isDefault', e.target.checked)}
          className="accent-brand-red"
        />
        <span className="text-sm text-gray-700">Đặt làm địa chỉ mặc định</span>
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-brand-red py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Đang lưu...' : 'Lưu Địa Chỉ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Hủy
        </button>
      </div>
    </form>
  )
}
