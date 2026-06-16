'use client'

import { useState } from 'react'
import Image from 'next/image'

type GalleryImage = {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
}

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const primary = images.find((i) => i.isPrimary) ?? images[0]
  const [active, setActive] = useState<GalleryImage | undefined>(primary)

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-8xl text-gray-200">
        📦
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
        <Image
          src={active?.url ?? primary!.url}
          alt={active?.altText ?? productName}
          fill
          className="object-contain transition duration-200"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setActive(img)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                active?.id === img.id ? 'border-brand-red' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <Image src={img.url} alt={img.altText ?? ''} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
