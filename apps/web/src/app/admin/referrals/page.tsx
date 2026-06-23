'use client'

import { useEffect, useState, useCallback } from 'react'
import { Gift, Users, Clock, Sparkles, Trophy, Loader2 } from 'lucide-react'

type Settings = { ENABLED: string; REFERRER_POINTS: string; REFEREE_POINTS: string; MAX_REDEEM_PERCENT: string }
type Stats = { totalReferrals: number; rewardedCount: number; pendingCount: number; pointsAwarded: number }
type TopReferrer = { referrerId: string; name: string; count: number; pointsBalance: number }
type RecentRow = {
  id: string; status: string; code: string; referrerPoints: number; refereePoints: number
  createdAt: string; qualifiedAt: string | null; referrer: string; referee: string
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ đặt giá', cls: 'bg-yellow-100 text-yellow-700' },
  REWARDED: { label: 'Đã thưởng', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-gray-100 text-gray-500' },
}

const fmt = (n: number) => n.toLocaleString('vi-VN')

export default function AdminReferralsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [top, setTop] = useState<TopReferrer[]>([])
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/v1/admin/referrals')
    if (res.ok) {
      const d = await res.json()
      setSettings(d.settings); setStats(d.stats); setTop(d.topReferrers); setRecent(d.recent)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(key: keyof Settings, value: string) {
    setSaving(key)
    setSettings((s) => (s ? { ...s, [key]: value } : s))
    await fetch('/api/v1/admin/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    setSaving(null)
  }

  if (loading || !settings || !stats) {
    return <div className="flex h-64 items-center justify-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const enabled = settings.ENABLED !== 'false'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Gift className="h-6 w-6 text-brand-red" /> Giới Thiệu Bạn Bè
        </h1>
        <p className="mt-1 text-sm text-gray-500">Chương trình khách giới thiệu khách — thưởng điểm khi người được mời đặt giá lần đầu.</p>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng lượt giới thiệu" value={fmt(stats.totalReferrals)} color="text-gray-900" />
        <StatCard icon={Gift} label="Đã thưởng" value={fmt(stats.rewardedCount)} color="text-emerald-600" />
        <StatCard icon={Clock} label="Chờ đặt giá" value={fmt(stats.pendingCount)} color="text-yellow-600" />
        <StatCard icon={Sparkles} label="Tổng điểm đã phát" value={fmt(stats.pointsAwarded)} color="text-brand-red" />
      </div>

      {/* Cấu hình */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">Cấu hình</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Bật chương trình</p>
              <p className="text-xs text-gray-500">Tắt sẽ ngừng cộng điểm giới thiệu mới</p>
            </div>
            <button
              onClick={() => save('ENABLED', enabled ? 'false' : 'true')}
              className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <NumberSetting
            label="Điểm thưởng người giới thiệu" hint="Cộng cho người đi mời (1 điểm = 1₫)"
            value={settings.REFERRER_POINTS} saving={saving === 'REFERRER_POINTS'}
            onSave={(v) => save('REFERRER_POINTS', v)}
          />
          <NumberSetting
            label="Điểm chào mừng người được mời" hint="Cộng cho người mới khi đặt giá lần đầu"
            value={settings.REFEREE_POINTS} saving={saving === 'REFEREE_POINTS'}
            onSave={(v) => save('REFEREE_POINTS', v)}
          />
          <NumberSetting
            label="% tối đa được giảm bằng điểm" hint="Giới hạn điểm dùng cho mỗi đơn / phiên thắng" suffix="%"
            value={settings.MAX_REDEEM_PERCENT} saving={saving === 'MAX_REDEEM_PERCENT'}
            onSave={(v) => save('MAX_REDEEM_PERCENT', v)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top referrers */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-gray-900">Top người giới thiệu</h2>
          </div>
          {top.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Chưa có dữ liệu</p>
          ) : (
            <div className="divide-y">
              {top.map((t, i) => (
                <div key={t.referrerId} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800">{t.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{t.count} lượt</p>
                    <p className="text-[11px] text-gray-400">Còn {fmt(t.pointsBalance)} điểm</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent referrals */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="border-b px-5 py-4"><h2 className="font-bold text-gray-900">Giới thiệu gần đây</h2></div>
          {recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Chưa có lượt giới thiệu nào</p>
          ) : (
            <div className="max-h-96 divide-y overflow-y-auto">
              {recent.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-gray-800">{r.referrer}</span>
                      <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">→ {r.referee}</p>
                    <p className="text-[11px] text-gray-400">
                      Mã {r.code} · {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      {r.status === 'REWARDED' && ` · +${fmt(r.referrerPoints)}/+${fmt(r.refereePoints)} điểm`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="flex items-center gap-1.5 text-xs text-gray-500"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function NumberSetting({ label, hint, value, suffix, saving, onSave }: {
  label: string; hint: string; value: string; suffix?: string; saving: boolean; onSave: (v: string) => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="relative">
          <input
            type="number" min={0} value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => local !== value && onSave(local)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-28 rounded-lg border px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
    </div>
  )
}
