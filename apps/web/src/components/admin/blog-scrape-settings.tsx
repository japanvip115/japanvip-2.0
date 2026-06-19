'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'

const PRESETS = [
  { label: 'Số điện thoại VN', value: '\\b(0|\\+84)(3[2-9]|5[6-9]|7[06-9]|8[1-9]|9[0-9])\\d{7}\\b' },
  { label: 'Link http/https', value: 'https?://[^\\s]+' },
  { label: 'Bình luận / Comment', value: '\\d+\\s*[Bb]ình\\s*luận' },
  { label: 'Nguồn: ...', value: 'Nguồn\\s*:\\s*.+' },
  { label: 'Xem thêm:', value: 'Xem thêm:.+' },
]

const INPUT = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

export function BlogScrapeSettings({ initial }: { initial: string[] }) {
  const [items, setItems] = useState<string[]>(initial)
  const [newVal, setNewVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function add(val: string) {
    const v = val.trim()
    if (!v || items.includes(v)) return
    setItems((p) => [...p, v])
    setNewVal('')
  }

  async function save() {
    setSaving(true); setSaved(false); setError('')
    try {
      const res = await fetch('/api/v1/admin/settings/blog-scrape', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocklist: items }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Preset quick-add */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">Thêm nhanh pattern phổ biến</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => add(p.value)}
              disabled={items.includes(p.value)}
              className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom pattern input */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">Thêm pattern tùy chỉnh</h3>
        <p className="mb-3 text-xs text-gray-500">Hỗ trợ chuỗi thường và Regex. Mỗi pattern sẽ được xóa khỏi nội dung bài viết khi nhập từ URL.</p>
        <div className="flex gap-2">
          <input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add(newVal)}
            placeholder='Ví dụ: congnghenhat\.com hoặc \b09\d{8}\b'
            className={`${INPUT} flex-1 font-mono`}
          />
          <button
            type="button"
            onClick={() => add(newVal)}
            disabled={!newVal.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-200">Danh sách pattern ({items.length})</h3>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có pattern nào. Thêm từ trên.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
                <code className="flex-1 truncate font-mono text-xs text-green-400">{item}</code>
                <button
                  type="button"
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Đang lưu...' : saved ? '✓ Đã lưu' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  )
}
