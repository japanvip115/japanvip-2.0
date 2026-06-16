'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import type { FontKey, FontMeta } from '@/lib/fonts'

export function FontSwitcher({
  fonts,
  activeFont,
}: {
  fonts: FontMeta[]
  activeFont: FontKey
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<FontKey>(activeFont)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const hasChanged = selected !== activeFont

  async function handleApply() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/v1/admin/settings/typography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ font: selected }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Đã lưu. Trang sẽ tải lại...')
        // Full reload so next/font variable classes take effect from server
        setTimeout(() => { window.location.reload() }, 800)
      } else {
        setMessage(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setMessage('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fonts.map((font) => {
          const isActive = font.key === activeFont
          const isSelected = font.key === selected

          return (
            <button
              key={font.key}
              onClick={() => setSelected(font.key)}
              className={`group relative rounded-xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? 'border-red-500 bg-red-950/20'
                  : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'
              }`}
            >
              {isActive && (
                <span className="absolute right-3 top-3 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                  Đang dùng
                </span>
              )}

              {/* Font specimen — uses the CSS var directly */}
              <p
                className="mb-3 text-2xl font-semibold text-white leading-snug"
                style={{ fontFamily: `var(${font.cssVar}), system-ui, sans-serif` }}
              >
                {font.label}
              </p>
              <p
                className="mb-3 text-sm text-gray-300 leading-relaxed"
                style={{ fontFamily: `var(${font.cssVar}), system-ui, sans-serif` }}
              >
                {font.specimen}
              </p>
              <p
                className="text-xs text-gray-500 leading-relaxed"
                style={{ fontFamily: `var(${font.cssVar}), system-ui, sans-serif` }}
              >
                {font.description}
              </p>

              {isSelected && !isActive && (
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-red-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã chọn
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleApply}
          disabled={!hasChanged || saving}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40 cursor-pointer"
        >
          {saving ? 'Đang lưu...' : 'Áp dụng font'}
        </button>

        {message && (
          <p className={`text-sm ${message.includes('lỗi') || message.includes('thể') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Thay đổi font áp dụng cho toàn bộ website. Cache sẽ tự động xóa sau khi lưu.
      </p>
    </div>
  )
}
