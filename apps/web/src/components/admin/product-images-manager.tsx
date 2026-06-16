'use client'

import { useState } from 'react'
import Image from 'next/image'

type ProductImage = {
  id: string
  url: string
  altText: string
  isPrimary: boolean
  sortOrder: number
}

export function ProductImagesManager({
  productId,
  initialImages,
}: {
  productId: string
  initialImages: ProductImage[]
}) {
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!ALLOWED.includes(file.type)) { setError('Chỉ chấp nhận JPG, PNG, WebP, AVIF'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File tối đa 10MB'); return }

    setUploading(true)
    setError('')

    try {
      // 1. Upload file to server (R2 in prod, local in dev)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'products')

      const uploadRes = await fetch('/api/v1/admin/products/upload-url', {
        method: 'POST',
        body: formData,
      })
      const upload = await uploadRes.json()
      if (!upload.success) throw new Error(upload.error)

      // 2. Save image record linked to product
      const saveRes = await fetch(`/api/v1/admin/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upload.data.publicUrl, isPrimary: images.length === 0 }),
      })
      const saved = await saveRes.json()
      if (saved.success) {
        setImages((prev) => [...prev, { ...saved.data, altText: saved.data.altText ?? '' }])
      } else {
        throw new Error(saved.error)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function setPrimary(imageId: string) {
    const res = await fetch(`/api/v1/admin/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    if ((await res.json()).success) {
      setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })))
    }
  }

  async function deleteImage(imageId: string) {
    if (!confirm('Xoá ảnh này?')) return
    const res = await fetch(`/api/v1/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' })
    if ((await res.json()).success) {
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="group relative">
            <div className={`relative h-24 w-24 overflow-hidden rounded-xl border-2 ${img.isPrimary ? 'border-brand-red' : 'border-gray-600'}`}>
              <Image src={img.url} alt={img.altText} fill className="object-cover" unoptimized={!img.url.includes('media.japanvip.vn')} />
              {img.isPrimary && (
                <span className="absolute bottom-0 left-0 right-0 bg-brand-red text-center text-xs font-bold text-white py-0.5">
                  Chính
                </span>
              )}
            </div>
            <div className="absolute inset-0 hidden group-hover:flex flex-col items-center justify-center gap-1 rounded-xl bg-black/70">
              {!img.isPrimary && (
                <button
                  onClick={() => setPrimary(img.id)}
                  className="text-xs font-medium text-white hover:text-yellow-300"
                >
                  Đặt chính
                </button>
              )}
              <button
                onClick={() => deleteImage(img.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Xoá
              </button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        <label className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="text-2xl">{uploading ? '⏳' : '+'}</span>
          <span className="text-xs mt-1">{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-gray-500">JPG, PNG, WebP · Tối đa 5MB · Nhấn giữ để xem tuỳ chọn</p>
    </div>
  )
}
