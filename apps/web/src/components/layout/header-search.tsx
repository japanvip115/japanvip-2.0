'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Tag, X } from 'lucide-react'

type Product = {
  id: string
  name: string
  slug: string
  salePrice: number | null
  originPrice: number | null
  images: { url: string }[]
  brand: { name: string } | null
  category: { name: string } | null
}

type Category = { id: string; name: string; slug: string; _count: { products: number } }

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫'
}

export function HeaderSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [focused, setFocused] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (val: string) => {
    if (val.length < 2) { setProducts([]); setCategories([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(val)}`)
      const json = await res.json()
      if (json.data) {
        setProducts(json.data.products)
        setCategories(json.data.categories)
        setOpen(json.data.products.length > 0 || json.data.categories.length > 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(val: string) {
    setQ(val)
    setFocused(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 280)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) {
      setOpen(false)
      router.push(`/san-pham?q=${encodeURIComponent(q.trim())}`)
    }
  }

  function clear() {
    setQ('')
    setOpen(false)
    setProducts([])
    setCategories([])
    inputRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Keyboard navigation
  const total = categories.length + products.length
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused((f) => Math.min(f + 1, total - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused((f) => Math.max(f - 1, -1)) }
    else if (e.key === 'Escape') { setOpen(false); setFocused(-1) }
    else if (e.key === 'Enter' && focused >= 0) {
      e.preventDefault()
      const catCount = categories.length
      if (focused < catCount) {
        router.push(`/danh-muc/${categories[focused]!.slug}`)
      } else {
        router.push(`/${products[focused - catCount]!.slug}`)
      }
      setOpen(false)
    }
  }

  const hasResults = products.length > 0 || categories.length > 0

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30 transition-all h-12">
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder="Tìm sản phẩm Nhật Bản..."
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-500 placeholder:font-medium"
        />
        {q && (
          <button type="button" onClick={clear} className="flex-shrink-0 px-1.5 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="submit"
          className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-r-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
        >
          {loading
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            : <Search className="h-3.5 w-3.5" />
          }
        </button>
      </form>

      {open && hasResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          {categories.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Danh mục</div>
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onMouseDown={() => { router.push(`/danh-muc/${cat.slug}`); setOpen(false) }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${focused === i ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <Tag className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                  <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{cat._count.products} sp</span>
                </button>
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Sản phẩm</div>
              {products.map((p, i) => {
                const fi = categories.length + i
                const price = p.salePrice ?? p.originPrice
                return (
                  <button
                    key={p.id}
                    onMouseDown={() => { router.push(`/${p.slug}`); setOpen(false) }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${focused === fi ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {p.images[0] && <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-800">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.brand && <span className="text-xs text-gray-400">{p.brand.name}</span>}
                        {p.category && <><span className="text-gray-300">·</span><span className="text-xs text-gray-400">{p.category.name}</span></>}
                      </div>
                    </div>
                    {price && <span className="flex-shrink-0 text-sm font-semibold text-red-600">{fmt(price)}</span>}
                  </button>
                )
              })}
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onMouseDown={handleSubmit as any}
              className="flex w-full items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              <Search className="h-3.5 w-3.5" />
              Xem tất cả kết quả cho &quot;{q}&quot;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
