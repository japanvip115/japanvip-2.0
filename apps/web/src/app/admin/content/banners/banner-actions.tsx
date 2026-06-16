'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function BannerActions({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Xóa banner này?')) return
    const res = await fetch(`/api/v1/admin/content/banners/${id}`, { method: 'DELETE' })
    if (res.ok) { router.refresh() }
    else { const j = await res.json(); alert(j.error ?? 'Lỗi') }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link href={`/admin/content/banners/${id}`} className="text-xs text-blue-400 hover:underline">Sửa</Link>
      <button onClick={handleDelete} className="text-xs text-red-400 hover:underline">Xóa</button>
    </div>
  )
}
