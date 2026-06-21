'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'

type Item = {
  key: string
  icon: string
  title: string
  desc: string
  enabled: boolean
  config: { hours?: number; days?: number; dayOfWeek?: number }
}

const DAY_LABELS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

export default function AutomationsAdminPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/v1/admin/automations')
      if (!res.ok) return
      const d = await res.json()
      setItems(d?.data ?? [])
    } catch { /* bỏ qua, giữ trạng thái rỗng */ } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function update(key: string, patch: Partial<Pick<Item, 'enabled' | 'config'>>) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch, config: { ...it.config, ...(patch.config ?? {}) } } : it))
    try {
      await fetch('/api/v1/admin/automations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...patch }),
      })
      setSavedKey(key); setTimeout(() => setSavedKey(null), 1500)
    } catch { /* bỏ qua */ }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-400 p-6"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải...</div>

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Tự Động Hóa Email</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bật/tắt và tinh chỉnh các luồng email tự động. Tôn trọng opt-out & link hủy đăng ký.</p>
      </div>

      <div className="space-y-3">
        {items.map(it => (
          <div key={it.key} className={`rounded-xl border p-4 transition-all ${it.enabled ? 'border-gray-700 bg-gray-800/60' : 'border-gray-800 bg-gray-900/40'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{it.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{it.title}</span>
                  {savedKey === it.key && <span className="flex items-center gap-1 text-[11px] text-emerald-400"><Check className="h-3 w-3" /> Đã lưu</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{it.desc}</p>

                {/* Tham số */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {'days' in it.config && (
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Gửi sau
                      <input type="number" min={1} max={365} value={it.config.days ?? 60} disabled={!it.enabled}
                        onChange={e => update(it.key, { config: { days: Number(e.target.value) } })}
                        className="w-16 rounded-md bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40" />
                      ngày không hoạt động
                    </label>
                  )}
                  {'hours' in it.config && (
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Nhắc sau
                      <input type="number" min={1} max={168} value={it.config.hours ?? 6} disabled={!it.enabled}
                        onChange={e => update(it.key, { config: { hours: Number(e.target.value) } })}
                        className="w-16 rounded-md bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40" />
                      giờ bỏ giỏ
                    </label>
                  )}
                  {'dayOfWeek' in it.config && (
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Gửi vào
                      <select value={it.config.dayOfWeek ?? 4} disabled={!it.enabled}
                        onChange={e => update(it.key, { config: { dayOfWeek: Number(e.target.value) } })}
                        className="rounded-md bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-40">
                        {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      hằng tuần
                    </label>
                  )}
                </div>
              </div>

              {/* Toggle */}
              <button onClick={() => update(it.key, { enabled: !it.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${it.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${it.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-blue-700/30 bg-blue-900/15 px-4 py-3 text-xs text-blue-300/80">
        💡 Win-back, bỏ giỏ hàng & digest chạy trong cron hằng ngày lúc 8:00. Welcome & sau-mua gửi tức thì theo sự kiện.
      </div>
    </div>
  )
}
