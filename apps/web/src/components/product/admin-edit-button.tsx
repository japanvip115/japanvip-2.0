'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

// Nút sửa SP — chỉ admin thấy (client-side để trang render TĨNH).
export function AdminEditButton({ productId }: { productId: string }) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null

  return (
    <div className="mb-4 flex items-center gap-2">
      <Link
        href={`/admin/products/${productId}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-gray-900 shadow hover:bg-amber-300 transition-colors"
      >
        ✏️ Sửa sản phẩm này
      </Link>
      <span className="text-xs text-gray-400">Chỉ admin thấy nút này</span>
    </div>
  )
}
