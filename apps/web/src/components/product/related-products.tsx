'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatVND } from '@japanvip/utils'

type Product = {
  id: string
  name: string
  slug: string
  originPrice: number | null
  images: { url: string }[]
  brand: { name: string } | null
}

type Props = { products: Product[]; title: string }

const VISIBLE = 5

export function RelatedProducts({ products, title }: Props) {
  const [offset, setOffset] = useState(0)
  if (products.length === 0) return null

  const maxOffset = Math.max(0, products.length - VISIBLE)
  const visible = products.slice(offset, offset + VISIBLE)

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white bg-gray-900 px-4 py-2 rounded-sm">
          {title}
        </h2>
      </div>
      <div className="relative border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visible.map((p) => (
            <Link
              key={p.id}
              href={`/${p.slug}`}
              className="group flex flex-col rounded-lg border border-gray-100 bg-white hover:border-brand-red hover:shadow-md transition-all overflow-hidden"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                {p.images[0] ? (
                  <img
                    src={p.images[0].url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                )}
              </div>
              <div className="p-2.5 flex flex-col gap-1">
                {p.brand && <p className="text-[10px] font-semibold uppercase text-gray-400">{p.brand.name}</p>}
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

        {/* Prev arrow */}
        {offset > 0 && (
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors text-gray-600"
          >
            ‹
          </button>
        )}
        {/* Next arrow */}
        {offset < maxOffset && (
          <button
            onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors text-gray-600"
          >
            ›
          </button>
        )}
      </div>
    </section>
  )
}
