'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ResolveFraudFlagButton({ flagId }: { flagId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function resolve() {
    if (!confirm('Đánh dấu cảnh báo này đã xử lý?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/fraud-flags/${flagId}`, { method: 'PATCH' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={resolve}
      disabled={loading}
      className="flex-shrink-0 rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-green-500 hover:text-green-400 disabled:opacity-50 transition-colors"
    >
      {loading ? '...' : 'Xử lý'}
    </button>
  )
}
