'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { ImageUploadField } from '@/components/admin/image-upload-field'

const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400'
const STEP = 5

function clamp(v: number) { return Math.max(0, Math.min(100, v)) }

function posToXY(pos: string): [number, number] {
  // "50% 30%" or legacy "center top" etc
  const parts = pos.trim().split(/\s+/)
  const parse = (s: string) => {
    if (s === 'left') return 0
    if (s === 'right') return 100
    if (s === 'top') return 0
    if (s === 'bottom') return 100
    if (s === 'center') return 50
    return parseInt(s) || 50
  }
  const x = parse(parts[0] ?? '50%')
  const y = parse(parts[1] ?? '50%')
  return [x, y]
}

export default function ProductsBannerSettingsPage() {
  const [url, setUrl] = useState('')
  const [x, setX] = useState(50)
  const [y, setY] = useState(50)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const position = `${x}% ${y}%`

  useEffect(() => {
    fetch('/api/v1/admin/settings/products-banner')
      .then((r) => r.json())
      .then((d) => {
        setUrl(d.data?.products_banner_url ?? '')
        const [px, py] = posToXY(d.data?.products_banner_position ?? '50% 50%')
        setX(px)
        setY(py)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/v1/admin/settings/products-banner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products_banner_url: url, products_banner_position: position }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/admin/settings'), 1000)
  }

  const BtnDir = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95 transition text-lg font-medium flex items-center justify-center"
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-100">Banner Trang Sản Phẩm</h1>
      <p className="text-sm text-gray-400">
        Hiển thị ở đầu trang <strong className="text-gray-300">/san-pham</strong> khi xem tất cả sản phẩm (không chọn danh mục cụ thể).
      </p>

      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-5">
        <div>
          <label className={LABEL}>Ảnh banner (1920×400px khuyến nghị)</label>
          <ImageUploadField
            value={url}
            onChange={setUrl}
            folder="banners"
            accept="image/jpeg,image/png,image/webp,image/avif"
          />
        </div>

        {url && (
          <>
            <div>
              <label className={LABEL}>Căn chỉnh ảnh</label>
              <div className="flex items-center gap-6 mt-2">
                {/* D-pad */}
                <div className="grid grid-cols-3 gap-1.5 w-fit">
                  <div />
                  <BtnDir label="↑" onClick={() => setY(clamp(y - STEP))} />
                  <div />
                  <BtnDir label="←" onClick={() => setX(clamp(x - STEP))} />
                  <button
                    type="button"
                    onClick={() => { setX(50); setY(50) }}
                    title="Căn giữa"
                    className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition text-xs flex items-center justify-center"
                  >
                    ⊙
                  </button>
                  <BtnDir label="→" onClick={() => setX(clamp(x + STEP))} />
                  <div />
                  <BtnDir label="↓" onClick={() => setY(clamp(y + STEP))} />
                  <div />
                </div>

                {/* Sliders */}
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Ngang</span><span className="text-gray-300">{x}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={x}
                      onChange={(e) => setX(Number(e.target.value))}
                      className="w-full accent-brand-red h-1.5 rounded-full cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Dọc</span><span className="text-gray-300">{y}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={y}
                      onChange={(e) => setY(Number(e.target.value))}
                      className="w-full accent-brand-red h-1.5 rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className={LABEL}>Xem trước</label>
              <div className="w-full h-40 overflow-hidden rounded-lg">
                <img
                  src={url}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: position }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Đang lưu...' : saved ? 'Đã lưu!' : 'Lưu'}
      </button>
    </div>
  )
}
