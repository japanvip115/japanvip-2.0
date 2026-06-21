'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, Save } from 'lucide-react'

type Ph = { key: string; desc: string }
type Item = {
  key: string
  icon: string
  title: string
  placeholders: Ph[]
  required: string[]
  enabled: boolean
  subject: string
  html: string
}

export default function EmailTemplatesAdminPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/v1/admin/email-templates')
      if (!res.ok) return
      const d = await res.json()
      setItems(d?.data ?? [])
    } catch { /* */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const current = items.find(i => i.key === sel)

  function select(key: string) {
    const it = items.find(i => i.key === key)
    setSel(key); setSubject(it?.subject ?? ''); setHtml(it?.html ?? ''); setSaved(false)
  }

  async function save(patch: { enabled?: boolean; subject?: string; html?: string }) {
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/admin/email-templates', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: current.key, ...patch }),
      })
      const data = await res.json().catch(() => null)
      if (!data?.success) { alert(data?.error || 'Lỗi lưu'); return }
      setItems(prev => prev.map(i => i.key === current.key ? { ...i, ...patch } : i))
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-400 p-6"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải...</div>

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Mẫu Email (dán HTML tự thiết kế)</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ghi đè email tự động bằng HTML từ builder ngoài. Tắt = dùng mẫu mặc định JapanVIP.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {items.map(it => (
          <button key={it.key} onClick={() => select(it.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${sel === it.key ? 'border-red-500 bg-red-500/10' : 'border-gray-700 bg-gray-800/60 hover:border-gray-500'}`}>
            <div className="flex items-center justify-between">
              <span className="text-lg">{it.icon}</span>
              {it.enabled && <span className="h-2 w-2 rounded-full bg-emerald-400" title="Đang bật" />}
            </div>
            <p className="text-xs font-medium text-gray-200 mt-1.5 leading-snug">{it.title}</p>
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">{current.icon} {current.title}</h2>
            <button onClick={() => save({ enabled: !current.enabled })} disabled={saving}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${current.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`} title={current.enabled ? 'Đang dùng template tùy biến' : 'Đang dùng mẫu mặc định'}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${current.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Placeholder dùng được (bấm để copy):</p>
            <div className="flex flex-wrap gap-1.5">
              {current.placeholders.map(p => (
                <button key={p.key} type="button" title={p.desc}
                  onClick={() => navigator.clipboard?.writeText(`{{${p.key}}}`)}
                  className={`rounded px-2 py-1 text-[11px] font-mono border ${current.required.includes(p.key) ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-gray-600 bg-gray-900 text-gray-300'} hover:border-gray-400`}>
                  {`{{${p.key}}}`}{current.required.includes(p.key) ? ' *' : ''}
                </button>
              ))}
            </div>
            {current.required.length > 0 && <p className="mt-1 text-[11px] text-amber-400/80">* bắt buộc — thiếu sẽ tự dùng mẫu mặc định</p>}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tiêu đề email <span className="text-gray-600">(để trống = dùng tiêu đề mặc định)</span></label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="VD: 🎌 Chào mừng {{ten}} đến Japan VIP"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">HTML đầy đủ (dán từ Stripo/BeeFree…)</label>
            <textarea value={html} onChange={e => setHtml(e.target.value)} rows={12}
              placeholder="<!DOCTYPE html>… dán toàn bộ HTML email …</html>"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500 resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => save({ subject, html })} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu nội dung
            </button>
            {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Đã lưu</span>}
          </div>
        </div>
      )}

      {!current && <p className="text-sm text-gray-500">Chọn một loại email phía trên để sửa.</p>}

      <div className="mt-4 rounded-lg border border-blue-700/30 bg-blue-900/15 px-4 py-3 text-xs text-blue-300/80">
        💡 Nhớ chèn placeholder vào HTML để hiện dữ liệu thật (vd <code className="text-amber-400">{'{{ten}}'}</code>, <code className="text-amber-400">{'{{maDon}}'}</code>). Bật toggle để bắt đầu dùng template tùy biến; tắt để quay về mẫu mặc định.
      </div>
    </div>
  )
}
