'use client'

import { useEffect, useState, useTransition } from 'react'
import { Trash2, ShieldBan, Plus, Loader2 } from 'lucide-react'

type BlockedIp = {
  id: string
  ip: string
  reason: string | null
  createdAt: string
}

export default function BlockedIpsPage() {
  const [ips, setIps] = useState<BlockedIp[]>([])
  const [loading, setLoading] = useState(true)
  const [newIp, setNewIp] = useState('')
  const [newReason, setNewReason] = useState('')
  const [adding, startAdding] = useTransition()
  const [removing, startRemoving] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function showMsg(ok: boolean, text: string) {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 2500)
  }

  useEffect(() => {
    fetch('/api/v1/admin/blocked-ips')
      .then((r) => r.json())
      .then((d) => { setIps(d.ips ?? []); setLoading(false) })
  }, [])

  function handleAdd() {
    if (!newIp.trim()) return
    startAdding(async () => {
      const res = await fetch('/api/v1/admin/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIp.trim(), reason: newReason.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setIps((prev) => [data.ip, ...prev])
        setNewIp('')
        setNewReason('')
        showMsg(true, `Đã chặn IP ${newIp}`)
      } else {
        showMsg(false, data.error ?? 'Thêm thất bại')
      }
    })
  }

  function handleRemove(ip: string) {
    startRemoving(async () => {
      const res = await fetch('/api/v1/admin/blocked-ips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      })
      if (res.ok) {
        setIps((prev) => prev.filter((r) => r.ip !== ip))
        showMsg(true, `Đã bỏ chặn IP ${ip}`)
      } else {
        showMsg(false, 'Xóa thất bại')
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${msg.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {msg.text}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldBan className="w-6 h-6 text-red-500" />
          Quản lý IP bị chặn
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Các IP trong danh sách này sẽ bị từ chối toàn bộ lệnh đặt giá.
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Thêm IP mới</h2>
        <div className="flex gap-2">
          <input
            placeholder="192.168.1.1 hoặc 2001:db8::1"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 h-9 px-3 text-sm font-mono rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <input
            placeholder="Lý do (tùy chọn)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="w-44 h-9 px-3 text-sm rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newIp.trim()}
            className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Chặn
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : ips.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Chưa có IP nào bị chặn</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">IP</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Lý do</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Ngày chặn</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {ips.map((row) => (
                <tr key={row.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-red-400">{row.ip}</td>
                  <td className="px-4 py-3 text-gray-400">{row.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(row.ip)}
                      disabled={removing}
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
