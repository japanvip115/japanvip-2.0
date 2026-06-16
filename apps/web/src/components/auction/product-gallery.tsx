'use client'

import { useState } from 'react'
import Image from 'next/image'

type GalleryImage = { id: string; url: string; isPrimary: boolean }

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const primaryIndex = images.findIndex((i) => i.isPrimary)
  const [activeIndex, setActiveIndex] = useState(primaryIndex >= 0 ? primaryIndex : 0)

  const active = images[activeIndex]

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
        {active ? (
          <Image
            src={active.url}
            alt={productName}
            fill
            className="object-contain transition-opacity duration-200"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                i === activeIndex
                  ? 'border-brand-red shadow-sm shadow-red-100'
                  : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
