'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { LogoTemplate } from '@/lib/template-matching'

export function LogoTemplatesManager() {
  const [templates, setTemplates] = useState<LogoTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/v1/admin/logo-templates')
      .then((r) => r.json())
      .then((d) => { if (d.success) setTemplates(d.data) })
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name || file.name.replace(/\.[^.]+$/, ''))

    try {
      const res = await fetch('/api/v1/admin/logo-templates', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setTemplates((prev) => [...prev, data.data])
      setName('')
      if (fileRef.current) fileRef.current.value = ''
      setSuccess('Đã thêm template thành công!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá template này?')) return
    const res = await fetch('/api/v1/admin/logo-templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (data.success) setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Hướng dẫn */}
      <div className="rounded-xl border border-blue-800/40 bg-blue-900/20 p-4 text-sm text-blue-300 space-y-1">
        <p className="font-semibold text-blue-200">Cách sử dụng:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-300/80">
          <li>Crop ảnh logo cần xoá từ một ảnh sản phẩm (ví dụ: logo JAPAN ở góc trên trái)</li>
          <li>Upload ảnh crop đó lên đây làm template</li>
          <li>Vào trang sản phẩm → Hình ảnh → nhấn <strong className="text-blue-200">🤖 Tự động xoá logo</strong></li>
          <li>Hệ thống sẽ so khớp template với ảnh và tự động xoá vùng trùng khớp</li>
        </ol>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-200">Thêm Logo Template</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Tên template</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Logo JAPAN phongcachnhat.vn"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Ảnh logo (crop vừa khít logo) <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-400 file:mr-3 file:rounded-md file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-xs file:text-gray-200 file:cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-600">Crop chính xác vùng logo, không thừa viền trắng nhiều</p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-brand-red px-5 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {uploading ? '⏳ Đang upload...' : 'Thêm Template'}
          </button>
        </form>
      </div>

      {/* Template list */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-200">
          Templates đã lưu ({templates.length})
        </h2>
        {loading ? (
          <p className="text-xs text-gray-500">Đang tải...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-gray-600 py-4 text-center">Chưa có template nào. Thêm template ở trên.</p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-700 bg-white">
                  <Image src={t.url} alt={t.name} fill className="object-contain p-1" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.width} × {t.height}px</p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="rounded-lg border border-red-800/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition"
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
