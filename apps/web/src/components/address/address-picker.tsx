'use client'

import { useState, useEffect } from 'react'
import { AddressForm } from './address-form'

export type Address = {
  id: string
  label?: string | null
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  street: string
  isDefault: boolean
}

type Props = {
  selectedId?: string | null
  onSelect: (address: Address | null) => void
}

export function AddressPicker({ selectedId, onSelect }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/v1/user/addresses')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAddresses(d.data)
          // Auto-select default if nothing selected
          if (!selectedId) {
            const def = d.data.find((a: Address) => a.isDefault) ?? d.data[0] ?? null
            if (def) onSelect(def)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleAddAddress(data: Parameters<typeof AddressForm>[0]['initial'] & {
    recipientName: string; phone: string; province: string; district: string; ward: string; street: string
  }) {
    const res = await fetch('/api/v1/user/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Lỗi lưu địa chỉ')
    const newAddr: Address = json.data
    setAddresses((prev) => {
      const updated = data.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev
      return [...updated, newAddr]
    })
    onSelect(newAddr)
    setShowForm(false)
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-2">Đang tải địa chỉ...</div>
  }

  const selectedAddr = addresses.find((a) => a.id === selectedId)

  // Gọn: đã có địa chỉ chọn → hiện tóm tắt 1 dòng + nút "Đổi" (form ngắn gọn)
  if (selectedAddr && !expanded && !showForm) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-red bg-red-50 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{selectedAddr.recipientName}</span>
            <span className="text-sm text-gray-500">{selectedAddr.phone}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {selectedAddr.street}, {selectedAddr.ward}, {selectedAddr.district}, {selectedAddr.province}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 text-xs font-semibold text-brand-red hover:underline"
        >
          Đổi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {addresses.map((addr) => (
        <label
          key={addr.id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
            selectedId === addr.id
              ? 'border-brand-red bg-red-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <input
            type="radio"
            name="address"
            checked={selectedId === addr.id}
            onChange={() => { onSelect(addr); setExpanded(false) }}
            className="mt-0.5 accent-brand-red"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{addr.recipientName}</span>
              <span className="text-sm text-gray-500">{addr.phone}</span>
              {addr.isDefault && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-red">
                  Mặc định
                </span>
              )}
              {addr.label && (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                  {addr.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {addr.street}, {addr.ward}, {addr.district}, {addr.province}
            </p>
          </div>
        </label>
      ))}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-brand-red hover:text-brand-red transition-colors"
        >
          + Thêm địa chỉ mới
        </button>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-800">Địa chỉ mới</p>
          <AddressForm
            onSave={handleAddAddress}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  )
}
