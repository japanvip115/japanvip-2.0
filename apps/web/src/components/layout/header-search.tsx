'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function HeaderSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/san-pham?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-brand-red focus-within:ring-1 focus-within:ring-brand-red/30 transition-all">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm kiếm sản phẩm Nhật Bản..."
        className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400"
      />
      <button
        type="submit"
        className="flex h-9 w-10 cursor-pointer items-center justify-center bg-brand-red text-white hover:bg-brand-red-dark transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  )
}
