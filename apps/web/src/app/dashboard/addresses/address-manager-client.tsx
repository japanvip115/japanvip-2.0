'use client'

import { useState } from 'react'
import { AddressForm } from '@/components/address/address-form'

type Address = {
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

export function AddressManagerClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(data: Parameters<typeof AddressForm>[0]['initial'] & {
    recipientName: string; phone: string; province: string; district: string; ward: string; street: string
  }) {
    const res = await fetch('/api/v1/user/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    const newAddr: Address = json.data
    setAddresses((prev) => {
      const updated = data.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev
      return [newAddr, ...updated]
    })
    setShowAdd(false)
  }

  async function handleEdit(id: string, data: Parameters<typeof AddressForm>[0]['initial'] & {
    recipientName: string; phone: string; province: string; district: string; ward: string; street: string
  }) {
    const res = await fetch(`/api/v1/user/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    setAddresses((prev) => {
      const updated = data.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev
      return updated.map((a) => (a.id === id ? json.data : a))
    })
    setEditId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá địa chỉ này?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/v1/user/addresses/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/v1/user/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    const json = await res.json()
    if (!json.success) return
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })))
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div key={addr.id} className="rounded-xl border bg-white p-5 shadow-sm">
          {editId === addr.id ? (
            <>
              <p className="mb-3 text-sm font-semibold text-gray-800">Chỉnh sửa địa chỉ</p>
              <AddressForm
                initial={addr}
                onSave={(data) => handleEdit(addr.id, data as any)}
                onCancel={() => setEditId(null)}
              />
            </>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{addr.recipientName}</span>
                  <span className="text-gray-500 text-sm">{addr.phone}</span>
                  {addr.isDefault && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-brand-red">
                      Mặc định
                    </span>
                  )}
                  {addr.label && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {addr.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {[addr.street, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-gray-400 hover:text-brand-red underline"
                  >
                    Mặc định
                  </button>
                )}
                <button
                  onClick={() => setEditId(addr.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
                >
                  {deletingId === addr.id ? '...' : 'Xoá'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {addresses.length === 0 && !showAdd && (
        <div className="rounded-xl border-2 border-dashed py-12 text-center text-gray-400">
          <p className="mb-2 text-lg">📍</p>
          <p className="text-sm">Chưa có địa chỉ nào</p>
        </div>
      )}

      {showAdd ? (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-gray-800">Thêm địa chỉ mới</p>
          <AddressForm onSave={handleAdd as any} onCancel={() => setShowAdd(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-brand-red hover:text-brand-red transition-colors"
        >
          + Thêm địa chỉ mới
        </button>
      )}
    </div>
  )
}
