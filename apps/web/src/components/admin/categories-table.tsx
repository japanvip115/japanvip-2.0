'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FolderOpen, ChevronRight, X, Loader2, ArrowRight, CheckSquare } from 'lucide-react'

interface ChildCategory {
  id: string
  name: string
  slug: string
  sortOrder: number
  isActive: boolean
  _count: { products: number }
}

interface Category extends ChildCategory {
  children: ChildCategory[]
}

interface ProductItem {
  id: string
  name: string
  slug: string
  status: string
  images: { url: string }[]
}

export function CategoriesTable({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial)
  const [panelCat, setPanelCat] = useState<Category | ChildCategory | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(false)
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(initial.filter(c => c.children.length > 0).map(c => c.id)))

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const [bulkTarget, setBulkTarget] = useState('')

  const allCats: ChildCategory[] = categories.flatMap((c) => [c, ...c.children])

  const openPanel = useCallback(async (cat: Category | ChildCategory) => {
    if (cat._count.products === 0) return
    setPanelCat(cat)
    setProducts([])
    setSelected(new Set())
    setBulkTarget('')
    setLoading(true)
    const res = await fetch(`/api/v1/admin/products?categoryId=${cat.id}&limit=200`)
    if (res.ok) {
      const json = await res.json()
      setProducts(json.data?.products ?? [])
    }
    setLoading(false)
  }, [])

  const updateCounts = useCallback((sourceCatId: string, targetCatId: string, count: number) => {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        _count: {
          products:
            c.id === sourceCatId ? c._count.products - count
            : c.id === targetCatId ? c._count.products + count
            : c._count.products,
        },
        children: c.children.map((ch) => ({
          ...ch,
          _count: {
            products:
              ch.id === sourceCatId ? ch._count.products - count
              : ch.id === targetCatId ? ch._count.products + count
              : ch._count.products,
          },
        })),
      }))
    )
  }, [])

  const moveProducts = useCallback(
    async (productIds: string[], targetCatId: string) => {
      if (!panelCat || targetCatId === panelCat.id || productIds.length === 0) return
      setMovingIds(new Set(productIds))
      const results = await Promise.all(
        productIds.map((id) =>
          fetch(`/api/v1/admin/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: targetCatId }),
          }).then((r) => ({ id, ok: r.ok }))
        )
      )
      const movedIds = new Set(results.filter((r) => r.ok).map((r) => r.id))
      const movedCount = movedIds.size
      if (movedCount > 0) {
        setProducts((prev) => prev.filter((p) => !movedIds.has(p.id)))
        setSelected((prev) => { const s = new Set(prev); movedIds.forEach((id) => s.delete(id)); return s })
        updateCounts(panelCat.id, targetCatId, movedCount)
        setPanelCat((prev) => prev ? { ...prev, _count: { products: prev._count.products - movedCount } } : null)
      }
      setMovingIds(new Set())
      setBulkTarget('')
    },
    [panelCat, updateCounts]
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map((p) => p.id)))
  }

  function CountBadge({ cat }: { cat: Category | ChildCategory }) {
    return (
      <button
        onClick={() => openPanel(cat)}
        disabled={cat._count.products === 0}
        title={cat._count.products > 0 ? 'Xem & chuyển sản phẩm' : 'Không có sản phẩm'}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium transition-colors ${
          cat._count.products > 0
            ? 'cursor-pointer text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
            : 'cursor-default text-gray-500'
        }`}
      >
        {cat._count.products}
        {cat._count.products > 0 && <ChevronRight className="h-3 w-3" />}
      </button>
    )
  }

  const isMoving = movingIds.size > 0

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Thứ tự</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Chưa có danh mục nào.{' '}
                  <Link href="/admin/categories/new" className="text-red-400 hover:underline">Tạo ngay</Link>
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <React.Fragment key={cat.id}>
                <tr className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">
                    <div className="flex items-center gap-1.5">
                      {cat.children.length > 0 ? (
                        <button onClick={() => toggleCollapse(cat.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
                          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${collapsed.has(cat.id) ? '' : 'rotate-90'}`} />
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                      {cat.name}
                      {cat.children.length > 0 && (
                        <span className="ml-1 text-xs text-gray-500">({cat.children.length})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-center"><CountBadge cat={cat} /></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-400">{cat.sortOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cat.isActive ? 'bg-green-500/15 text-green-400 ring-green-500/20' : 'bg-gray-500/15 text-gray-400 ring-gray-500/20'}`}>
                      {cat.isActive ? 'Hiện' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/categories/${cat.id}`} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white">Sửa</Link>
                  </td>
                </tr>
                {!collapsed.has(cat.id) && cat.children.map((child) => (
                  <tr key={child.id} className="hover:bg-gray-700/30 transition-colors bg-gray-900/20">
                    <td className="px-4 py-2.5 text-sm text-gray-300">
                      <div className="flex items-center gap-1.5 ml-6">
                        <ChevronRight className="h-3 w-3 text-gray-600" />
                        <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
                        {child.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{child.slug}</td>
                    <td className="px-4 py-2.5 text-center"><CountBadge cat={child} /></td>
                    <td className="px-4 py-2.5 text-center text-sm text-gray-500">{child.sortOrder}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${child.isActive ? 'bg-green-500/15 text-green-400 ring-green-500/20' : 'bg-gray-500/15 text-gray-400 ring-gray-500/20'}`}>
                        {child.isActive ? 'Hiện' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/admin/categories/${child.id}`} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white">Sửa</Link>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-in panel */}
      {panelCat && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPanelCat(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative flex h-full w-full max-w-lg flex-col bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ArrowRight className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">{panelCat.name}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {products.length} sản phẩm — tick chọn rồi chuyển hàng loạt
                </p>
              </div>
              <button onClick={() => setPanelCat(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bulk action bar */}
            {!loading && products.length > 0 && (
              <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800/60 px-5 py-3">
                {/* Select all */}
                <input
                  type="checkbox"
                  checked={selected.size === products.length && products.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-600 accent-blue-500"
                />
                <span className="text-xs text-gray-400 mr-2">
                  {selected.size > 0 ? `Đã chọn ${selected.size}` : 'Chọn tất cả'}
                </span>

                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  disabled={selected.size === 0 || isMoving}
                  className="flex-1 cursor-pointer rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-40"
                >
                  <option value="">Chuyển sang danh mục...</option>
                  {allCats.filter((c) => c.id !== panelCat.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  disabled={selected.size === 0 || !bulkTarget || isMoving}
                  onClick={() => moveProducts([...selected], bulkTarget)}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                  Chuyển
                </button>
              </div>
            )}

            {/* Product list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">Không có sản phẩm</div>
              ) : (
                products.map((p) => {
                  const isSelected = selected.has(p.id)
                  const isThisMoving = movingIds.has(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isThisMoving && toggleSelect(p.id)}
                      className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-all ${
                        isThisMoving ? 'opacity-40' : isSelected ? 'bg-blue-500/10' : 'hover:bg-gray-800/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isThisMoving}
                        className="h-4 w-4 cursor-pointer rounded border-gray-600 accent-blue-500"
                      />
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                        {p.images[0] ? (
                          <Image src={p.images[0].url} alt={p.name} width={40} height={40} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gray-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-200">{p.name}</div>
                        <div className="truncate text-xs text-gray-500">{p.slug}</div>
                      </div>
                      {isThisMoving && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
