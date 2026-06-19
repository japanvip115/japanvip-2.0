'use client'

import { useState } from 'react'
import { Download, Clipboard } from 'lucide-react'

export function BlogBulkImport() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[]; total: number } | null>(null)
  const [error, setError] = useState('')

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.startsWith('http')) setUrl(text.trim())
    } catch { /* ignore */ }
  }

  async function handleImport() {
    if (!url.trim()) return
    setLoading(true); setResult(null); setError('')
    try {
      const res = await fetch('/api/v1/admin/content/blog/scrape-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi không xác định')
      setResult(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-400" />
          Nhập hàng loạt theo danh mục URL
        </span>
        <span className="text-gray-500 text-xs">{open ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-700 px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500">
            Dán URL trang danh mục (ví dụ: <code className="text-gray-400">https://congnghenhat.com/tin-tuc/huong-dan-su-dung</code>). Hệ thống sẽ tự tìm tất cả bài viết và nhập về dạng Bản nháp.
          </p>

          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Dán từ clipboard"
            >
              <Clipboard className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                  Đang nhập...
                </>
              ) : (
                <><Download className="h-4 w-4" /> Nhập bài</>
              )}
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          {result && (
            <div className="rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-white">
                Kết quả: tìm thấy <span className="text-blue-400">{result.total}</span> bài
              </p>
              <p className="text-sm text-green-400">✓ Đã nhập: {result.imported} bài</p>
              {result.skipped > 0 && <p className="text-sm text-gray-400">⟳ Bỏ qua (đã có): {result.skipped} bài</p>}
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-red-400 cursor-pointer">✕ Lỗi: {result.errors.length} bài</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-gray-500 truncate">{e}</li>
                    ))}
                  </ul>
                </details>
              )}
              {result.imported > 0 && (
                <p className="text-xs text-gray-500 pt-1">Bài đã nhập ở trạng thái Bản nháp — vào danh sách để duyệt và xuất bản.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
