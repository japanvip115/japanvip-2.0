'use client'

import { useState } from 'react'
import { Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'

type Props = {
  productId: string
  status: ProductStatus
  auctionCount: number
}

export function ProductActions({ productId, status, auctionCount }: Props) {
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  async function handleToggleStatus() {
    const next = status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    setLoadingStatus(true)
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error ?? 'Có lỗi xảy ra')
        setLoadingStatus(false)
        return
      }
      window.location.reload()
    } catch {
      alert('Không thể kết nối. Vui lòng thử lại.')
      setLoadingStatus(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Xoá sản phẩm này? Hành động không thể hoàn tác.')) return
    setLoadingDelete(true)
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        alert(data.error ?? 'Không thể xoá')
        setLoadingDelete(false)
        return
      }
      window.location.reload()
    } catch {
      alert('Không thể kết nối. Vui lòng thử lại.')
      setLoadingDelete(false)
    }
  }

  const isPublished = status === 'ACTIVE'

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Nút chuyển trạng thái */}
      <button
        onClick={handleToggleStatus}
        disabled={loadingStatus || status === 'SOLD'}
        title={isPublished ? 'Ẩn khỏi web' : 'Hiển thị trên web'}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isPublished
            ? 'bg-green-500/15 text-green-400 hover:bg-green-500/30'
            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        {loadingStatus ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPublished ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Nút xoá */}
      <button
        onClick={handleDelete}
        disabled={loadingDelete || auctionCount > 0}
        title={auctionCount > 0 ? 'Không thể xoá — đang có phiên đấu giá' : 'Xoá sản phẩm'}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loadingDelete ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
