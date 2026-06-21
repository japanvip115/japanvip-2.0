'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { formatVND } from '@japanvip/utils'
import { Link2, Plus, Copy, Check, Trash2, Search, Loader2, MousePointerClick, ShoppingBag, X } from 'lucide-react'

type AffLink = {
  id: string
  trackingCode: string
  label: string | null
  destinationUrl: string
  clicks: number
  orders: number
  revenue: string | number
  commission: string | number
  createdAt: string
}

type ProductHit = {
  id: string
  name: string
  slug: string
  salePrice: number | null
  images: { url: string }[]
}

export function PartnerLinksClient() {
  const [refCode, setRefCode] = useState('')
  const [links, setLinks] = useState<AffLink[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/partner/links')
      const data = await res.json()
      if (data.success) {
        setRefCode(data.data.refCode)
        setLinks(data.data.links)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  // Debounce product search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data?.data?.products ?? [])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  function fullUrl(l: AffLink) {
    return `${origin}${l.destinationUrl}?ref=${refCode}&al=${l.trackingCode}`
  }

  async function copyLink(l: AffLink) {
    try {
      await navigator.clipboard.writeText(fullUrl(l))
      setCopiedId(l.id)
      setTimeout(() => setCopiedId(null), 1800)
    } catch { /* ignore */ }
  }

  async function createForProduct(p: ProductHit) {
    setCreating(true)
    try {
      const res = await fetch('/api/v1/partner/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id }),
      })
      const data = await res.json()
      if (data.success) {
        setShowPicker(false); setQuery(''); setResults([])
        fetchLinks()
      } else {
        alert(data.error ?? 'Không tạo được link')
      }
    } finally {
      setCreating(false)
    }
  }

  async function createHomeLink() {
    setCreating(true)
    try {
      const res = await fetch('/api/v1/partner/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationUrl: '/', label: 'Trang chủ Japan VIP' }),
      })
      const data = await res.json()
      if (data.success) { setShowPicker(false); fetchLinks() }
    } finally {
      setCreating(false)
    }
  }

  async function deleteLink(id: string) {
    if (!confirm('Xóa link này? Thống kê click của link sẽ mất.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/v1/partner/links?id=${id}`, { method: 'DELETE' })
      fetchLinks()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-brand-red" /> Link Giới Thiệu
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo link gắn mã CTV <strong className="text-gray-700">{refCode || '...'}</strong> — khách bấm vào, mua trong 30 ngày là bạn được hoa hồng.
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition shrink-0"
        >
          <Plus className="h-4 w-4" /> Tạo link
        </button>
      </div>

      {/* Links list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Đang tải...
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Link2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có link nào</p>
          <button onClick={() => setShowPicker(true)} className="mt-3 text-sm text-brand-red hover:underline">
            + Tạo link đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => (
            <div key={l.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{l.label ?? l.destinationUrl}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded-lg bg-gray-50 border px-2.5 py-1.5 text-xs text-gray-600">
                      {origin}{l.destinationUrl}?ref={refCode}&al={l.trackingCode}
                    </code>
                    <button
                      onClick={() => copyLink(l)}
                      className="shrink-0 flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      {copiedId === l.id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Đã chép</> : <><Copy className="h-3.5 w-3.5" /> Chép</>}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => deleteLink(l.id)}
                  disabled={deletingId === l.id}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {/* Stats */}
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Stat icon={<MousePointerClick className="h-3.5 w-3.5" />} label="Click" value={String(l.clicks)} />
                <Stat icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Đơn" value={String(l.orders)} />
                <Stat label="Doanh thu" value={formatVND(Number(l.revenue))} />
                <Stat label="Hoa hồng" value={formatVND(Number(l.commission))} highlight />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20" onClick={() => setShowPicker(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-gray-900">Chọn sản phẩm để tạo link</h2>
              <button onClick={() => setShowPicker(false)} className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên sản phẩm hoặc thương hiệu..."
                  className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-red"
                />
              </div>

              <button
                onClick={createHomeLink}
                disabled={creating}
                className="w-full rounded-lg border border-dashed py-2 text-xs text-gray-500 hover:bg-gray-50 transition"
              >
                Hoặc tạo link về trang chủ Japan VIP
              </button>

              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {searching ? (
                  <div className="py-8 text-center text-gray-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : results.length === 0 && query.trim().length >= 2 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Không tìm thấy sản phẩm</p>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => createForProduct(p)}
                      disabled={creating}
                      className="flex w-full items-center gap-3 rounded-lg border p-2 text-left hover:border-brand-red hover:bg-red-50/30 transition disabled:opacity-50"
                    >
                      <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border bg-gray-50">
                        {p.images?.[0]?.url && <Image src={p.images[0].url} alt={p.name} fill className="object-contain p-0.5" sizes="44px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        {p.salePrice && <p className="text-xs font-semibold text-brand-red">{formatVND(p.salePrice)}</p>}
                      </div>
                      <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-gray-400">
        {icon}{label}
      </div>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? 'text-brand-red' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
