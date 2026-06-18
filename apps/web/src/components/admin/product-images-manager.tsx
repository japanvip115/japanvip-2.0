'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type ProductImage = {
  id: string
  url: string
  altText: string
  isPrimary: boolean
  sortOrder: number
}

type ProcessAction = { imageId: string; action: 'watermark' | 'remove-logo' | 'auto-remove' }
type Rect = { x: number; y: number; w: number; h: number }
type DragPos = { x: number; y: number }

// ── Selection Modal ──────────────────────────────────────────────────────────
function SelectionModal({
  url,
  onConfirm,
  onClose,
}: {
  url: string
  onConfirm: (rect: Rect) => void
  onClose: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragging, setDragging] = useState(false)
  const [start, setStart] = useState<DragPos>({ x: 0, y: 0 })
  const [end, setEnd] = useState<DragPos>({ x: 0, y: 0 })
  const [done, setDone] = useState(false)

  // Close on Escape key only — no backdrop click-to-close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function getPos(e: React.MouseEvent): DragPos {
    const img = imgRef.current!
    const r = img.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - r.left, r.width)),
      y: Math.max(0, Math.min(e.clientY - r.top, r.height)),
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const p = getPos(e)
    setStart(p); setEnd(p)
    setDragging(true); setDone(false)
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setEnd(getPos(e))
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!dragging) return
    setEnd(getPos(e))
    setDragging(false); setDone(true)
  }

  function toImageRect(): Rect | null {
    const img = imgRef.current
    if (!img) return null
    const scaleX = img.naturalWidth / img.clientWidth
    const scaleY = img.naturalHeight / img.clientHeight
    const x1 = Math.min(start.x, end.x), y1 = Math.min(start.y, end.y)
    const x2 = Math.max(start.x, end.x), y2 = Math.max(start.y, end.y)
    return {
      x: Math.round(x1 * scaleX), y: Math.round(y1 * scaleY),
      w: Math.round((x2 - x1) * scaleX), h: Math.round((y2 - y1) * scaleY),
    }
  }

  const selLeft = Math.min(start.x, end.x)
  const selTop  = Math.min(start.y, end.y)
  const selW    = Math.abs(end.x - start.x)
  const selH    = Math.abs(end.y - start.y)
  const hasSelection = (dragging || done) && selW > 4 && selH > 4

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 gap-4 p-4">
      {/* Top bar — only close button closes modal */}
      <div className="flex items-center gap-3">
        <p className="rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
          🖱 Kéo chuột để bôi chọn vùng logo cần xoá
        </p>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-600 bg-gray-800/80 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
        >
          ✕ Đóng (Esc)
        </button>
      </div>

      {/* Image with drag overlay — pointer-events on wrapper only */}
      <div
        className="relative select-none cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { if (dragging) { setDragging(false); setDone(selW > 4 && selH > 4) } }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={url}
          alt=""
          draggable={false}
          className="block max-h-[75vh] max-w-[90vw] rounded-xl shadow-2xl pointer-events-none"
        />
        {hasSelection && (
          <div
            className="pointer-events-none absolute rounded border-2 border-orange-400 bg-orange-400/25"
            style={{ left: selLeft, top: selTop, width: selW, height: selH }}
          >
            <span className="absolute -bottom-6 left-0 whitespace-nowrap rounded bg-orange-500 px-1.5 py-0.5 text-xs font-semibold text-white shadow">
              {Math.round(selW)} × {Math.round(selH)} px
            </span>
          </div>
        )}
      </div>

      {/* Confirm */}
      {done && selW > 4 && selH > 4 && (
        <button
          onClick={() => { const r = toImageRect(); if (r) onConfirm(r) }}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition"
        >
          Xoá vùng đã chọn
        </button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [processing, setProcessing] = useState<string | null>(null)
  const [panelImg, setPanelImg] = useState<string | null>(null)
  const [selectImg, setSelectImg] = useState<{ id: string; url: string } | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    setUploading(true)
    setError('')
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) { setError('Chỉ chấp nhận JPG, PNG, WebP, AVIF'); continue }
      if (file.size > 10 * 1024 * 1024) { setError('File tối đa 10MB'); continue }
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')
        const uploadRes = await fetch('/api/v1/admin/products/upload-url', { method: 'POST', body: formData })
        const upload = await uploadRes.json()
        if (!upload.success) throw new Error(upload.error)
        const saveRes = await fetch(`/api/v1/admin/products/${productId}/images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: upload.data.publicUrl, isPrimary: images.length === 0 }),
        })
        const saved = await saveRes.json()
        if (saved.success) setImages((prev) => [...prev, { ...saved.data, altText: saved.data.altText ?? '' }])
        else throw new Error(saved.error)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload thất bại')
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  async function setPrimary(imageId: string) {
    const res = await fetch(`/api/v1/admin/products/${productId}/images/${imageId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    if ((await res.json()).success)
      setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })))
  }

  async function deleteImage(imageId: string) {
    if (!confirm('Xoá ảnh này?')) return
    const res = await fetch(`/api/v1/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' })
    if ((await res.json()).success) {
      setImages((prev) => prev.filter((img) => img.id !== imageId))
      if (panelImg === imageId) setPanelImg(null)
    }
  }

  async function processImage({ imageId, action }: ProcessAction, rect?: Rect) {
    setProcessing(imageId + ':' + action)
    setError('')
    try {
      const body: Record<string, unknown> = { imageId, action }
      if (action === 'remove-logo' && rect) body.rect = rect

      const res = await fetch('/api/v1/admin/images/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Xử lý thất bại')
      if (action === 'auto-remove' && data.data.detected === false) {
        setError(data.data.message ?? 'Không tìm thấy logo. Thêm template tại Cài Đặt → Logo Templates.')
        return
      }
      setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, url: data.data.url } : img)))
      setPanelImg(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xử lý thất bại')
    } finally {
      setProcessing(null)
    }
  }

  async function handleSelectConfirm(rect: Rect) {
    if (!selectImg) return
    setSelectImg(null)
    setPanelImg(selectImg.id)
    await processImage({ imageId: selectImg.id, action: 'remove-logo' }, rect)
  }

  return (
    <>
      {/* Selection modal */}
      {selectImg && (
        <SelectionModal
          url={selectImg.url}
          onConfirm={handleSelectConfirm}
          onClose={() => setSelectImg(null)}
        />
      )}

      <div>
        <div className="mb-4 flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <div
                className={`relative h-24 w-24 overflow-hidden rounded-xl border-2 cursor-pointer ${img.isPrimary ? 'border-brand-red' : 'border-gray-600'}`}
                onClick={() => setPanelImg(panelImg === img.id ? null : img.id)}
              >
                <Image src={img.url} alt={img.altText} fill className="object-cover" unoptimized={!img.url.includes('media.japanvip.vn')} />
                {img.isPrimary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand-red text-center text-xs font-bold text-white py-0.5">Chính</span>
                )}
                {processing?.startsWith(img.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                    <span className="text-white text-xs animate-pulse">⏳</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteImage(img.id) }}
                className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-500"
              >
                ×
              </button>
            </div>
          ))}

          <label className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-2xl">{uploading ? '⏳' : '+'}</span>
            <span className="text-xs mt-1">{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {/* Action panel */}
        {panelImg && (() => {
          const img = images.find((i) => i.id === panelImg)
          if (!img) return null
          const isProc = processing?.startsWith(panelImg)
          return (
            <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-600">
                  <Image src={img.url} alt={img.altText} fill className="object-cover" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate mb-2">{img.url.split('/').pop()}</p>
                  <div className="flex flex-wrap gap-2">
                    {!img.isPrimary && (
                      <button type="button" onClick={() => { setPrimary(img.id); setPanelImg(null) }}
                        className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-500/30 transition">
                        Đặt chính
                      </button>
                    )}
                    <button type="button" onClick={() => processImage({ imageId: img.id, action: 'watermark' })} disabled={!!isProc}
                      className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30 transition disabled:opacity-50">
                      {processing === img.id + ':watermark' ? '⏳...' : '🔏 Watermark'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setError(''); setSelectImg({ id: img.id, url: img.url }) }}
                      disabled={!!isProc}
                      className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/30 transition disabled:opacity-50">
                      {processing === img.id + ':remove-logo' ? '⏳ Đang xử lý...' : '🖱 Chọn vùng xoá logo'}
                    </button>
                    <button type="button" onClick={() => processImage({ imageId: img.id, action: 'auto-remove' })} disabled={!!isProc}
                      className="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-500/30 transition disabled:opacity-50">
                      {processing === img.id + ':auto-remove' ? '⏳...' : '🤖 Tự động xoá'}
                    </button>
                    <button type="button" onClick={() => deleteImage(img.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition">
                      Xoá
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <p className="text-xs text-gray-500">JPG, PNG, WebP · Tối đa 10MB · Nhấn vào ảnh để xem tuỳ chọn</p>
      </div>
    </>
  )
}
