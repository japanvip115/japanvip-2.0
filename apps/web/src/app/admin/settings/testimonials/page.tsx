'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Star, GripVertical, Eye, EyeOff, Upload, X } from 'lucide-react'

type T = { id: string; name: string; city: string; photoUrl: string | null; text: string; rating: number; type: string; sortOrder: number; isActive: boolean }

const EMPTY: Omit<T, 'id'> = { name: '', city: '', photoUrl: '', text: '', rating: 5, type: 'GENERAL', sortOrder: 0, isActive: true }

export default function TestimonialsAdminPage() {
  const [list, setList] = useState<T[]>([])
  const [editing, setEditing] = useState<(Partial<T> & { id?: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [productReviewsOn, setProductReviewsOn] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function toggleProductReviews() {
    const next = !productReviewsOn
    setProductReviewsOn(next)
    await fetch('/api/v1/admin/settings/product-reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }),
    })
  }

  async function uploadPhoto(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'testimonials')
      const res = await fetch('/api/v1/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.data?.publicUrl) setEditing(p => ({ ...p!, photoUrl: data.data.publicUrl }))
    } finally {
      setUploading(false)
    }
  }

  const load = () => fetch('/api/v1/admin/testimonials').then(r => r.json()).then(setList)
  useEffect(() => {
    load()
    fetch('/api/v1/admin/settings/product-reviews').then(r => r.json()).then(d => setProductReviewsOn(!!d.enabled)).catch(() => {})
  }, [])

  async function save() {
    if (!editing) return
    setSaving(true)
    const method = editing.id ? 'PUT' : 'POST'
    await fetch('/api/v1/admin/testimonials', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Xóa đánh giá này?')) return
    await fetch('/api/v1/admin/testimonials', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  async function toggle(t: T) {
    await fetch('/api/v1/admin/testimonials', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...t, isActive: !t.isActive }) })
    load()
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Đánh Giá Khách Hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">{list.length} đánh giá</p>
        </div>
        <button onClick={() => setEditing(EMPTY)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
          <Plus className="h-4 w-4" /> Thêm Đánh Giá
        </button>
      </div>

      {/* Công tắc ẩn/hiện đánh giá sao ở TRANG SẢN PHẨM */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/60 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Hiện đánh giá sao ở trang sản phẩm</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {productReviewsOn
              ? 'Đang HIỆN sao + tab đánh giá trên mỗi trang sản phẩm.'
              : 'Đang ẨN — trang sản phẩm không hiển thị sao/đánh giá. (Thay đổi hiện sau ~5 phút do cache)'}
          </p>
        </div>
        <button type="button" onClick={toggleProductReviews}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${productReviewsOn ? 'bg-emerald-500' : 'bg-gray-600'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${productReviewsOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="space-y-3">
        {list.map(t => (
          <div key={t.id} className={`flex gap-4 rounded-xl border p-4 transition-all ${t.isActive ? 'border-gray-700 bg-gray-800/60' : 'border-gray-800 bg-gray-900/40 opacity-50'}`}>
            {t.photoUrl ? (
              <img src={t.photoUrl} alt={t.name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {t.name.split(' ').map(w => w[0]).slice(-2).join('')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white">{t.name}</span>
                <span className="text-xs text-gray-500">{t.city}</span>
                <span className="text-yellow-400 text-xs">{'★'.repeat(t.rating)}</span>
                {t.type === 'AUCTION' && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/30">ĐẤU GIÁ</span>
                )}
                <span className="text-xs text-gray-600">#{t.sortOrder}</span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{t.text}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggle(t)} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700">
                {t.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => setEditing(t)} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => del(t.id)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">{editing.id ? 'Sửa đánh giá' : 'Thêm đánh giá'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Họ tên *</label>
                  <input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" placeholder="Nguyễn Thị Lan" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Thành phố</label>
                  <input value={editing.city ?? ''} onChange={e => setEditing(p => ({ ...p!, city: e.target.value }))}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" placeholder="Hà Nội" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ảnh đại diện</label>
                <div className="flex items-center gap-3">
                  {editing.photoUrl ? (
                    <div className="relative flex-shrink-0">
                      <img src={editing.photoUrl} className="h-14 w-14 rounded-full object-cover border border-gray-700" onError={e => e.currentTarget.style.display = 'none'} />
                      <button onClick={() => setEditing(p => ({ ...p!, photoUrl: '' }))}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500">
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center flex-shrink-0">
                      <Upload className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full rounded-lg border border-dashed border-gray-600 bg-gray-800 px-3 py-2 text-xs text-gray-400 hover:border-red-500 hover:text-white transition-colors disabled:opacity-50">
                      {uploading ? 'Đang tải lên...' : 'Chọn ảnh từ máy tính'}
                    </button>
                    <input value={editing.photoUrl ?? ''} onChange={e => setEditing(p => ({ ...p!, photoUrl: e.target.value }))}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" placeholder="Hoặc dán URL ảnh..." />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nội dung đánh giá *</label>
                <textarea value={editing.text ?? ''} onChange={e => setEditing(p => ({ ...p!, text: e.target.value }))} rows={3}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none" placeholder="Nội dung..." />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Loại đánh giá</label>
                <div className="flex gap-2">
                  {([
                    { value: 'GENERAL', label: '🏠 Chung (trang chủ)' },
                    { value: 'AUCTION', label: '🔨 Đấu giá' },
                  ] as const).map(o => (
                    <button key={o.value} type="button" onClick={() => setEditing(p => ({ ...p!, type: o.value }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        (editing.type ?? 'GENERAL') === o.value
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-gray-600">Chung → hiện ở trang chủ. Đấu giá → hiện ở cuối trang chi tiết đấu giá.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Số sao (1-5)</label>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setEditing(p => ({ ...p!, rating: n }))}
                        className={`text-xl ${(editing.rating ?? 5) >= n ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Thứ tự hiển thị</label>
                  <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing(p => ({ ...p!, sortOrder: Number(e.target.value) }))}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">Hủy</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
