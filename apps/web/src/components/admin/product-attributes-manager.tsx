'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'

type Attribute = { id: string; name: string; value: string }
type DraftRow = { key: string; name: string; value: string }

const INPUT_CLS = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'

export function ProductAttributesManager({
  productId,
  initialAttributes,
}: {
  productId: string
  initialAttributes: Attribute[]
}) {
  const [attrs, setAttrs] = useState(initialAttributes)
  const [drafts, setDrafts] = useState<DraftRow[]>([{ key: crypto.randomUUID(), name: '', value: '' }])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function addDrafts() {
    const valid = drafts.filter((d) => d.name.trim() && d.value.trim())
    if (!valid.length) return

    setSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes: valid.map((d) => ({ name: d.name.trim(), value: d.value.trim() })) }),
      })
      const data = await res.json()
      if (data.success) {
        setAttrs((prev) => [...prev, ...data.data])
        setDrafts([{ key: crypto.randomUUID(), name: '', value: '' }])
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(attr: Attribute) {
    setEditingId(attr.id)
    setEditName(attr.name)
    setEditValue(attr.value)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/v1/admin/products/${productId}/attributes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), value: editValue.trim() }),
    })
    if ((await res.json()).success) {
      setAttrs((prev) => prev.map((a) => a.id === id ? { ...a, name: editName.trim(), value: editValue.trim() } : a))
      setEditingId(null)
    }
  }

  async function deleteAttr(id: string) {
    if (!confirm('Xoá thông số này?')) return
    const res = await fetch(`/api/v1/admin/products/${productId}/attributes/${id}`, { method: 'DELETE' })
    if ((await res.json()).success) {
      setAttrs((prev) => prev.filter((a) => a.id !== id))
    }
  }

  function updateDraft(key: string, field: 'name' | 'value', val: string) {
    setDrafts((prev) => prev.map((d) => d.key === key ? { ...d, [field]: val } : d))
  }

  function addDraftRow() {
    setDrafts((prev) => [...prev, { key: crypto.randomUUID(), name: '', value: '' }])
  }

  function removeDraftRow(key: string) {
    if (drafts.length === 1) return
    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  return (
    <div className="space-y-4">
      {/* Existing attributes */}
      {attrs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/3">Thông số</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Giá trị</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {attrs.map((attr) => (
                <tr key={attr.id} className="hover:bg-gray-700/30 transition-colors">
                  {editingId === attr.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => saveEdit(attr.id)} className="mr-2 text-xs text-green-400 hover:text-green-300 cursor-pointer">Lưu</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer">Huỷ</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-400">{attr.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{attr.value}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(attr)} className="mr-2 text-gray-500 hover:text-gray-300 cursor-pointer" title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteAttr(attr.id)} className="text-red-500/70 hover:text-red-400 cursor-pointer" title="Xoá">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prefix guide */}
      <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Prefix đặc biệt (nhập vào cột Tên)</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-[11px] text-gray-500">
          {[
            { prefix: '[quick] Xuất xứ', desc: '→ Hiện ngay dưới giá' },
            { prefix: '[group:Tên nhóm] Dung tích', desc: '→ Nhóm thông số' },
            { prefix: '[faq] Câu hỏi?', desc: '→ Tab Hỏi & Đáp (value = trả lời)' },
            { prefix: '[video] Tên video', desc: '→ Tab Video (value = URL YouTube)' },
            { prefix: '[promo] Tên KM', desc: '→ Box khuyến mãi' },
            { prefix: '[warranty] Bảo hành', desc: '→ Box bảo hành' },
          ].map(({ prefix, desc }) => (
            <div key={prefix} className="flex items-start gap-1.5">
              <code className="shrink-0 rounded bg-gray-700 px-1 py-0.5 font-mono text-[10px] text-yellow-300">{prefix}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add new rows */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Thêm thông số mới</p>
        {drafts.map((draft) => (
          <div key={draft.key} className="flex gap-2 items-center">
            <input
              value={draft.name}
              onChange={(e) => updateDraft(draft.key, 'name', e.target.value)}
              placeholder="Tên (vd: Dung tích)"
              className={INPUT_CLS}
            />
            <input
              value={draft.value}
              onChange={(e) => updateDraft(draft.key, 'value', e.target.value)}
              placeholder="Giá trị (vd: 5.5L)"
              className={INPUT_CLS}
            />
            <button
              onClick={() => removeDraftRow(draft.key)}
              disabled={drafts.length === 1}
              className="rounded-lg border border-gray-700/50 bg-gray-800 p-2 text-gray-600 hover:text-red-400 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addDraftRow}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dòng
          </button>
          <button
            type="button"
            onClick={addDrafts}
            disabled={saving || drafts.every((d) => !d.name.trim())}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Đang lưu...' : 'Lưu thông số'}
          </button>
        </div>
      </div>
    </div>
  )
}
