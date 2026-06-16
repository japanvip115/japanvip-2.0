'use client'

import { useId, useRef, useState } from 'react'

export type ImageUploadFolder = 'products' | 'banners' | 'blogs' | 'brands' | 'categories' | 'category-icons'

type Props = {
  value: string
  onChange: (url: string) => void
  folder: ImageUploadFolder
  label?: string
  required?: boolean
  placeholder?: string
  previewClass?: string
}

export function ImageUploadField({
  value,
  onChange,
  folder,
  label,
  required,
  placeholder = 'https://...',
  previewClass = 'h-32 w-full',
}: Props) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!ALLOWED.includes(file.type)) {
      setError('Chỉ chấp nhận JPG, PNG, WebP, AVIF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File tối đa 10MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Upload thất bại')

      onChange(data.data.publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setError('') }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-600 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-400">⚠ {error}</p>}

      {value && !uploading && (
        <div className="group relative mt-2 inline-block w-full">
          <img
            src={value}
            alt="Preview"
            className={`${previewClass} rounded object-cover`}
            onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0.3' }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-900"
          >
            ✕ Xóa
          </button>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">JPG · PNG · WebP · AVIF · Tối đa 10MB</p>
    </div>
  )
}
