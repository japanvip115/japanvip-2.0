'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatVND } from '@japanvip/utils'

type ViewedProduct = {
  id: string
  name: string
  slug: string
  originPrice: number | null
  imageUrl: string | null
}

const KEY = 'jvip_recently_viewed'
const MAX = 10

export function RecentlyViewed({ current }: { current: ViewedProduct }) {
  const [items, setItems] = useState<ViewedProduct[]>([])

  useEffect(() => {
    // Load existing
    let stored: ViewedProduct[] = []
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch { stored = [] }

    // Add current, dedupe, cap at MAX
    const next = [current, ...stored.filter((p) => p.id !== current.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))

    // Show all except current
    setItems(next.filter((p) => p.id !== current.id))
  }, [current.id])

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white bg-gray-900 px-4 py-2 rounded-sm inline-block">
          Sản Phẩm Vừa Xem
        </h2>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/${p.slug}`}
              className="group flex flex-col rounded-lg border border-gray-100 bg-white hover:border-brand-red hover:shadow-md transition-all overflow-hidden"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                )}
              </div>
              <div className="p-2.5 flex flex-col gap-1">
                <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                {p.originPrice ? (
                  <p className="text-sm font-bold text-brand-red mt-0.5">{formatVND(p.originPrice)}</p>
                ) : (
                  <p className="text-sm font-bold text-brand-red mt-0.5">Liên hệ</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
