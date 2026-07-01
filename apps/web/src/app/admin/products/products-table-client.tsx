'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ImageOff, ExternalLink, Trash2 } from 'lucide-react'
import { ProductActions } from '@/components/admin/product-actions'

type Status = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED'

export interface ProductRow {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  categoryName: string | null
  brandName: string | null
  status: Status
  auctionCount: number
  createdAt: string
}

const STATUS_COLORS: Record<Status, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  DRAFT: 'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
  SOLD: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/20',
  ARCHIVED: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
}
const STATUS_LABELS: Record<Status, string> = { ACTIVE: 'Đang bán', DRAFT: 'Bản nháp', SOLD: 'Đã bán', ARCHIVED: 'Lưu kho' }

export function ProductsTableClient({ products, returnTo }: { products: ProductRow[]; returnTo: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const allChecked = products.length > 0 && sel.size === products.length

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleAll() {
    setSel(allChecked ? new Set() : new Set(products.map((p) => p.id)))
  }

  async function bulkDelete() {
    if (!sel.size) return
    if (!confirm(`Xoá ${sel.size} sản phẩm đã chọn? Hành động không thể hoàn tác.`)) return
    setBusy(true)
    const res = await fetch('/api/v1/admin/products/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...sel] }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.success) {
      alert(json.message)
      window.location.reload()
    } else alert('❌ ' + (json.error || 'Lỗi'))
  }

  const linkTo = (id: string) => `/admin/products/${id}?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <>
      {sel.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5">
          <span className="text-sm text-gray-200">Đã chọn <b className="text-white">{sel.size}</b> sản phẩm</span>
          <button
            onClick={bulkDelete}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {busy ? 'Đang xoá…' : 'Xoá đã chọn'}
          </button>
          <button onClick={() => setSel(new Set())} className="text-xs text-gray-400 hover:underline">Bỏ chọn</button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-3 py-3 text-center">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 cursor-pointer accent-red-600" title="Chọn tất cả" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Danh mục / Thương hiệu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Đấu giá</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày tạo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {products.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">Không có sản phẩm nào</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={sel.has(p.id) ? 'bg-red-500/5' : 'transition-colors hover:bg-gray-700/30'}>
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 cursor-pointer accent-red-600" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={linkTo(p.id)} className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-700">
                          <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="40px" unoptimized={!p.imageUrl.includes('media.japanvip.vn')} />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-700/30">
                          <ImageOff className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate text-sm font-medium text-gray-300 hover:text-white">{p.name}</p>
                        <p className="font-mono text-xs text-gray-500">{p.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300">{p.categoryName ?? '—'}</p>
                    <p className="text-xs text-gray-500">{p.brandName ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">{p.auctionCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Xem trên web" className="text-gray-400 transition-colors hover:text-white">
                        <ExternalLink size={15} />
                      </a>
                      <Link href={linkTo(p.id)} className="whitespace-nowrap text-xs font-medium text-red-400 hover:underline">Chi tiết</Link>
                      <ProductActions productId={p.id} status={p.status} auctionCount={p.auctionCount} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
