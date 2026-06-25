'use client'

import { useState } from 'react'
import { ProductDescription } from '@/components/product/product-description'

type Attribute = { id: string; name: string; value: string }

export function ProductTabs({
  description,
  attributes,
}: {
  description: string | null
  attributes: Attribute[]
}) {
  const [tab, setTab] = useState<'desc' | 'specs'>('desc')

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden flex flex-col">
      {/* Tab header */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('desc')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'desc'
              ? 'text-brand-red border-b-2 border-brand-red bg-white'
              : 'text-gray-500 bg-gray-50 hover:text-gray-700'
          }`}
        >
          Mô tả sản phẩm
        </button>
        <button
          onClick={() => setTab('specs')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'specs'
              ? 'text-brand-red border-b-2 border-brand-red bg-white'
              : 'text-gray-500 bg-gray-50 hover:text-gray-700'
          }`}
        >
          Thông số kỹ thuật
        </button>
      </div>

      {/* Tab body */}
      {tab === 'desc' && (
        description
          ? <ProductDescription description={description} collapseHeight={152} />
          : <div className="p-4 text-sm text-gray-400 italic">Chưa có mô tả sản phẩm.</div>
      )}

      {tab === 'specs' && (
        attributes.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {attributes.map((attr, i) => (
              <div key={attr.id} className={`flex items-start px-4 py-2.5 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <span className="text-xs text-gray-500 w-2/5 shrink-0 pt-0.5">{attr.name.replace(/^\[[^\]]+\]/, '')}</span>
                <span className="text-xs font-semibold text-gray-800 flex-1">{attr.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-gray-400 italic">Chưa có thông số kỹ thuật.</div>
        )
      )}
    </div>
  )
}
