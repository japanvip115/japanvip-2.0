'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Star, Loader2 } from 'lucide-react'

type UploadedImage = { url: string; isPrimary: boolean }

type Props = {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
}

export function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

    setError('')
    setUploading(true)

    const results: UploadedImage[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED.includes(file.type)) { setError('Chỉ chấp nhận JPG, PNG, WebP, AVIF'); continue }
      if (file.size > 10 * 1024 * 1024) { setError('File tối đa 10MB'); continue }

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')

        const res = await fetch('/api/v1/admin/products/upload-url', { method: 'POST', body: formData })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        results.push({ url: data.data.publicUrl, isPrimary: false })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload thất bại')
      }
    }

    if (results.length > 0) {
      onChange([
        ...images.map((img, i) => ({ ...img, isPrimary: i === 0 && images.length > 0 ? img.isPrimary : false })),
        ...results,
      ].map((img, i) => ({ ...img, isPrimary: i === 0 })))
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function setPrimary(idx: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })))
  }

  function remove(idx: number) {
    const next = images.filter((_, i) => i !== idx)
    if (next.length > 0 && !next.some((img) => img.isPrimary)) next[0]!.isPrimary = true
    onChange(next)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="group relative">
              <div className={`relative h-24 w-24 overflow-hidden rounded-xl border-2 transition-colors ${img.isPrimary ? 'border-red-500' : 'border-gray-600'}`}>
                <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                {img.isPrimary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-center text-[10px] font-bold text-white py-0.5">
                    Ảnh chính
                  </span>
                )}
              </div>
              <div className="absolute inset-0 hidden group-hover:flex flex-col items-center justify-center gap-1.5 rounded-xl bg-black/70">
                {!img.isPrimary && (
                  <button type="button" onClick={() => setPrimary(idx)}
                    className="flex items-center gap-1 text-xs font-medium text-yellow-300 hover:text-yellow-200">
                    <Star className="h-3 w-3" /> Đặt chính
                  </button>
                )}
                <button type="button" onClick={() => remove(idx)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  <X className="h-3 w-3" /> Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
          uploading ? 'border-gray-700 opacity-60 pointer-events-none' : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800/40'
        }`}
      >
        {uploading ? (
          <><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><p className="text-sm text-gray-400">Đang upload...</p></>
        ) : (
          <>
            <Upload className="h-6 w-6 text-gray-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">Kéo thả ảnh vào đây hoặc nhấn để chọn</p>
              <p className="mt-0.5 text-xs text-gray-600">JPG, PNG, WebP, AVIF · Tối đa 10MB · Có thể chọn nhiều ảnh</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
