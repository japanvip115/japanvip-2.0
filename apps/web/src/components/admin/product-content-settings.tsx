'use client'

import { useState } from 'react'

const TEXTAREA = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

export function ProductContentSettings({ initialCommitments, initialShipping }: { initialCommitments: string; initialShipping: string }) {
  const [commitments, setCommitments] = useState(initialCommitments)
  const [shippingNotes, setShippingNotes] = useState(initialShipping)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setSaved(false); setError('')
    try {
      const res = await fetch('/api/v1/admin/settings/product-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitments, shippingNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Lỗi')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="mb-1 text-sm font-semibold text-gray-200">Dòng cam kết (dưới Tình trạng)</h3>
        <p className="mb-3 text-xs text-gray-500">Mỗi dòng = 1 gạch đầu dòng ✓. Áp dụng cho mọi trang sản phẩm.</p>
        <textarea
          value={commitments}
          onChange={(e) => setCommitments(e.target.value)}
          rows={4}
          className={TEXTAREA}
          placeholder={'Hàng nội địa Nhật Bản mới 100%, nguyên hộp\nNhập khẩu trực tiếp, có tem nhập khẩu đầy đủ\nMiễn phí vận chuyển toàn quốc'}
        />
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h3 className="mb-1 text-sm font-semibold text-gray-200">Ô giao hàng (khung xanh có icon xe tải)</h3>
        <p className="mb-3 text-xs text-gray-500">Mỗi dòng = 1 gạch đầu dòng ✔.</p>
        <textarea
          value={shippingNotes}
          onChange={(e) => setShippingNotes(e.target.value)}
          rows={4}
          className={TEXTAREA}
          placeholder={'Giao hàng trong 2 giờ (HN & TP. HCM)\nMiễn phí ship toàn quốc\nHướng dẫn sử dụng sản phẩm tại nhà'}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ Đã lưu</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  )
}
