'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Props = {
  logoUrl: string
  faviconUrl: string
  siteName: string
  taglineJp: string
}

export function LogoSettingsForm({ logoUrl: initLogoUrl, faviconUrl: initFaviconUrl, siteName: initSiteName, taglineJp: initTagline }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState(initLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initFaviconUrl)
  const [siteName, setSiteName] = useState(initSiteName)
  const [taglineJp, setTaglineJp] = useState(initTagline)
  const [uploading, setUploading] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'settings')
    const res = await fetch('/api/v1/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    return data.data.publicUrl
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMsg(null)
    try {
      setLogoUrl(await uploadFile(file))
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Upload thất bại' })
    } finally {
      setUploading(false)
    }
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFavicon(true)
    setMsg(null)
    try {
      setFaviconUrl(await uploadFile(file))
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Upload thất bại' })
    } finally {
      setUploadingFavicon(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/v1/admin/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_logo_url: logoUrl,
          site_favicon_url: faviconUrl,
          site_name: siteName,
          site_tagline_jp: taglineJp,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setMsg({ ok: true, text: 'Đã lưu. Tải lại trang để xem thay đổi.' })
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Lỗi lưu cài đặt' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo upload */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Logo Website</h2>

        {/* Preview */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-20 w-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={160} height={80} className="object-contain"  />
            ) : (
              <span className="text-xs text-gray-400">Chưa có logo</span>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Kích thước khuyến nghị: <strong>400×120px</strong></p>
            <p className="text-xs text-gray-400 mt-0.5">PNG, WebP, SVG — nền trong suốt tốt nhất</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? 'Đang tải lên...' : '📁 Chọn ảnh logo'}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl('')}
              className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Xóa logo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {/* Manual URL input */}
        <div className="mt-3">
          <label className="mb-1 block text-xs text-gray-500">Hoặc nhập URL logo trực tiếp</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-red"
          />
        </div>
      </div>

      {/* Favicon upload */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-1 font-semibold text-gray-900">Favicon (icon trên tab trình duyệt)</h2>
        <p className="mb-4 text-xs text-gray-400">Icon nhỏ hiển thị trên tab trình duyệt và khi lưu bookmark.</p>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
            {faviconUrl ? (
              <Image src={faviconUrl} alt="Favicon" width={64} height={64} className="object-contain" />
            ) : (
              <span className="text-center text-[10px] text-gray-400">Chưa có</span>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Kích thước khuyến nghị: <strong>512×512px</strong> (vuông)</p>
            <p className="text-xs text-gray-400 mt-0.5">PNG hoặc ICO — nền trong suốt tốt nhất</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => faviconRef.current?.click()}
            disabled={uploadingFavicon}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploadingFavicon ? 'Đang tải lên...' : '📁 Chọn ảnh favicon'}
          </button>
          {faviconUrl && (
            <button
              type="button"
              onClick={() => setFaviconUrl('')}
              className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Xóa favicon
            </button>
          )}
        </div>
        <input ref={faviconRef} type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" className="hidden" onChange={handleFaviconChange} />

        <div className="mt-3">
          <label className="mb-1 block text-xs text-gray-500">Hoặc nhập URL favicon trực tiếp</label>
          <input
            type="text"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-red"
          />
        </div>
      </div>

      {/* Text fallback settings */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-1 font-semibold text-gray-900">Tên & Tagline</h2>
        <p className="mb-4 text-xs text-gray-400">Dùng khi không có ảnh logo, hoặc hiển thị phụ bên cạnh logo.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên thương hiệu</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-red"
              placeholder="Japan VIP"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tagline tiếng Nhật</label>
            <input
              type="text"
              value={taglineJp}
              onChange={(e) => setTaglineJp(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-red"
              placeholder="日本ブランド"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Xem trước</h2>
        <div className="rounded-lg bg-white p-4 shadow-inner border flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo preview" width={120} height={48} className="object-contain"  />
          ) : (
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold">
                <span className="text-brand-red">{siteName.split(' ')[0] ?? 'JAPAN'}</span>
                <span className="text-gray-900"> {siteName.split(' ').slice(1).join(' ') || 'VIP'}</span>
              </span>
              <span className="text-xs text-gray-500">{taglineJp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-xl bg-brand-red px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {msg.ok ? '✓' : '✗'} {msg.text}
          </span>
        )}
      </div>
    </div>
  )
}
