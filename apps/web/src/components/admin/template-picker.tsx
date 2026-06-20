'use client'

import { useState, useRef, useEffect } from 'react'
import { PRODUCT_TEMPLATES } from '@/lib/product-description-templates'

type Props = {
  onSelect: (html: string) => void
}

export function TemplatePicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirm(null)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handlePick(key: string) {
    setConfirm(key)
  }

  function handleConfirm() {
    const t = PRODUCT_TEMPLATES.find((t) => t.key === confirm)
    if (t) {
      onSelect(t.html.trim())
      setOpen(false)
      setConfirm(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setConfirm(null) }}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Dùng template
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-700 px-4 py-3">
            <p className="text-xs font-semibold text-gray-200">Chọn template danh mục</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Các ô màu vàng là chỗ cần điền thông tin cụ thể
            </p>
          </div>

          {/* Confirm state */}
          {confirm ? (
            <div className="p-4">
              <p className="text-xs text-gray-300 mb-3">
                Nội dung hiện tại sẽ bị <span className="text-red-400 font-semibold">thay thế</span> bằng template{' '}
                <span className="text-white font-semibold">
                  {PRODUCT_TEMPLATES.find((t) => t.key === confirm)?.icon}{' '}
                  {PRODUCT_TEMPLATES.find((t) => t.key === confirm)?.label}
                </span>.
                Tiếp tục?
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={handleConfirm}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors">
                  Dùng template này
                </button>
                <button type="button" onClick={() => setConfirm(null)}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {PRODUCT_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handlePick(t.key)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors group"
                >
                  <span className="text-lg shrink-0">{t.icon}</span>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
