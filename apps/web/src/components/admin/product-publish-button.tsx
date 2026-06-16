'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, EyeOff, Loader2 } from 'lucide-react'

type Props = {
  productId: string
  status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'
}

export function ProductPublishButton({ productId, status }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (status === 'SOLD') return null

  const isPublished = status === 'ACTIVE'

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isPublished ? 'DRAFT' : 'ACTIVE' }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error ?? 'Có lỗi xảy ra')
        setLoading(false)
        return
      }
      if (!isPublished) {
        router.push('/admin/products')
      } else {
        window.location.reload()
      }
    } catch {
      alert('Không thể kết nối. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isPublished
          ? 'border border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:text-white'
          : 'bg-green-600 text-white hover:bg-green-500'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      {isPublished ? 'Ẩn khỏi web' : 'Đăng lên web'}
    </button>
  )
}
