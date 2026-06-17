'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, ShieldOff } from 'lucide-react'

export function ContentProtectionToggle({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle() {
    const next = !enabled
    startTransition(async () => {
      await fetch('/api/v1/admin/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_protection_enabled: String(next) }),
      })
      setEnabled(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {enabled
          ? <ShieldCheck className="h-5 w-5 text-green-400" />
          : <ShieldOff className="h-5 w-5 text-gray-500" />
        }
        <div>
          <p className="text-sm font-medium text-gray-200">Chống copy nội dung</p>
          <p className="text-xs text-gray-500">
            {enabled
              ? 'Đang bật — khách không thể chuột phải, bôi đen, copy text trên toàn site'
              : 'Đang tắt — khách có thể copy nội dung bình thường'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {saved && <span className="text-xs text-green-400">✓ Đã lưu</span>}
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
            enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  )
}
