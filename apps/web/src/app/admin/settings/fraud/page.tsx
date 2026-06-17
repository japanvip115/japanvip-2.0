'use client'

import { useEffect, useState, useTransition } from 'react'

const RULE_META = [
  {
    key: 'SAME_IP_PREBID',
    label: 'Chặn cùng IP trong phiên',
    description: 'Block bid nếu IP đó đã bid từ tài khoản khác trong cùng phiên',
    category: 'block',
  },
  {
    key: 'BID_VELOCITY',
    label: 'Giới hạn tốc độ đặt giá',
    description: 'Chặn bot/script — giới hạn số bid mỗi phút',
    category: 'block',
    thresholdKey: 'BID_VELOCITY_MAX',
    thresholdLabel: 'Tối đa bid/phút',
    thresholdUnit: 'bid',
  },
  {
    key: 'FRAUD_SCORE_SUSPEND',
    label: 'Tự động khóa theo điểm',
    description: 'Cộng dồn điểm mỗi lần bid bị flag; vượt ngưỡng → khóa tài khoản',
    category: 'block',
    thresholdKey: 'FRAUD_SCORE_THRESHOLD',
    thresholdLabel: 'Ngưỡng khóa',
    thresholdUnit: 'điểm',
  },
  {
    key: 'COOLING_OFF',
    label: 'Thời gian chờ sau khi thắng',
    description: 'Ngăn thắng nhiều phiên cùng danh mục trong thời gian ngắn',
    category: 'block',
    thresholdKey: 'COOLING_OFF_DAYS',
    thresholdLabel: 'Số ngày chờ',
    thresholdUnit: 'ngày',
  },
  {
    key: 'SAME_IP_MULTI_ACCOUNT',
    label: 'Nhiều tài khoản cùng IP',
    description: '2+ tài khoản dùng cùng IP trong 1 phiên',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_SAME_IP_MULTI_ACCOUNT',
  },
  {
    key: 'BID_SPIKE',
    label: 'Bid tăng đột biến',
    description: 'Bid tăng >50% so với bid liền trước trong vòng 1 giây',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_BID_SPIKE',
  },
  {
    key: 'NEW_ACCOUNT_HIGH_BID',
    label: 'Tài khoản mới bid cao',
    description: 'Tài khoản <24h tuổi đặt giá >5× giá khởi điểm ngay lần đầu',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_NEW_ACCOUNT_HIGH_BID',
  },
  {
    key: 'SHILL_BID',
    label: 'Shill bidding',
    description: '1 tài khoản đặt giá ≥3 lần trong 30 giây',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_SHILL_BID',
  },
  {
    key: 'DEVICE_MULTI_ACCOUNT',
    label: 'Nhiều tài khoản cùng thiết bị',
    description: '2+ tài khoản dùng cùng device fingerprint trong 1 phiên',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_DEVICE_MULTI_ACCOUNT',
  },
  {
    key: 'OTP_HIGH_VALUE',
    label: 'OTP xác nhận bid lớn',
    description: 'Yêu cầu mã OTP email cho lệnh bid vượt ngưỡng',
    category: 'protection',
    thresholdKey: 'BID_OTP_THRESHOLD',
    thresholdLabel: 'Ngưỡng giá',
    thresholdUnit: '₫',
  },
] as const

const CATEGORY_CONFIG = {
  block:      { label: 'Chặn',   color: 'text-red-400',    dot: 'bg-red-500',    header: 'bg-red-900/20 border-red-800/50' },
  flag:       { label: 'Gắn cờ', color: 'text-yellow-400', dot: 'bg-yellow-500', header: 'bg-yellow-900/20 border-yellow-800/50' },
  protection: { label: 'Bảo vệ', color: 'text-blue-400',   dot: 'bg-blue-500',   header: 'bg-blue-900/20 border-blue-800/50' },
}

type Settings = Record<string, string>

export default function FraudSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, startSaving] = useTransition()
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/fraud-settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings ?? {}); setLoading(false) })
  }, [])

  function save(key: string, value: string) {
    startSaving(async () => {
      const res = await fetch('/api/v1/admin/fraud-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }))
        setSavedKey(key)
        setTimeout(() => setSavedKey(null), 1500)
      } else {
        setError('Lưu thất bại')
        setTimeout(() => setError(null), 2000)
      }
    })
  }

  if (loading) return <div className="py-16 text-center text-gray-500 text-sm">Đang tải...</div>

  const categories = ['block', 'flag', 'protection'] as const
  const grouped = categories.map((cat) => ({
    cat,
    rules: RULE_META.filter((r) => r.category === cat),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cài đặt chống gian lận</h1>
          <p className="text-sm text-gray-400 mt-0.5">Thay đổi có hiệu lực sau tối đa 30 giây</p>
        </div>
        {error && (
          <span className="rounded-lg bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300">{error}</span>
        )}
        {savedKey && !error && (
          <span className="rounded-lg bg-green-900/50 px-3 py-1.5 text-xs font-medium text-green-300">✓ Đã lưu</span>
        )}
      </div>

      {/* Global thresholds */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 bg-gray-800 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ngưỡng toàn cục</p>
        </div>
        <div className="divide-y divide-gray-700/50">
          {[
            { key: 'FRAUD_SCORE_BLOCK_THRESHOLD', label: 'Điểm tối thiểu để chặn bid ngay', unit: 'điểm' },
            { key: 'FRAUD_SCORE_THRESHOLD',       label: 'Điểm khóa tài khoản tự động',     unit: 'điểm' },
          ].map(({ key, label, unit }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-gray-300">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 h-8 px-2 text-sm rounded-lg bg-gray-900 border border-gray-600 text-white text-right focus:outline-none focus:border-red-500"
                  value={settings[key] ?? ''}
                  onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                  onBlur={(e) => save(key, e.target.value)}
                />
                <span className="text-xs text-gray-500 w-10">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules grouped by category */}
      {grouped.map(({ cat, rules }) => {
        const cfg = CATEGORY_CONFIG[cat]
        return (
          <div key={cat} className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
            {/* Category header */}
            <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${cfg.header}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <p className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
            </div>

            {/* Rules */}
            <div className="divide-y divide-gray-700/50">
              {rules.map((rule) => {
                const enabled = settings[rule.key] !== 'false'
                const hasWeight = 'weightKey' in rule && rule.weightKey
                const hasThreshold = 'thresholdKey' in rule && rule.thresholdKey

                return (
                  <div key={rule.key} className={`px-4 py-3 transition-colors ${!enabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save(rule.key, enabled ? 'false' : 'true')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                          enabled ? 'bg-red-600' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-200">{rule.label}</span>
                          <code className="text-[10px] text-gray-600 font-mono hidden sm:inline">{rule.key}</code>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rule.description}</p>
                      </div>

                      {/* Weight input */}
                      {hasWeight && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-500 hidden md:inline">Điểm:</span>
                          <input
                            type="number"
                            className="w-16 h-7 px-2 text-xs rounded-lg bg-gray-900 border border-gray-600 text-white text-right focus:outline-none focus:border-red-500 disabled:opacity-40"
                            value={settings[rule.weightKey!] ?? ''}
                            disabled={!enabled || saving}
                            onChange={(e) => setSettings((p) => ({ ...p, [rule.weightKey!]: e.target.value }))}
                            onBlur={(e) => save(rule.weightKey!, e.target.value)}
                          />
                          <span className="text-xs text-gray-600">đ</span>
                        </div>
                      )}

                      {/* Threshold input */}
                      {hasThreshold && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-500 hidden md:inline">{rule.thresholdLabel}:</span>
                          <input
                            type="number"
                            className="w-24 h-7 px-2 text-xs rounded-lg bg-gray-900 border border-gray-600 text-white text-right focus:outline-none focus:border-red-500 disabled:opacity-40"
                            value={settings[rule.thresholdKey!] ?? ''}
                            disabled={!enabled || saving}
                            onChange={(e) => setSettings((p) => ({ ...p, [rule.thresholdKey!]: e.target.value }))}
                            onBlur={(e) => save(rule.thresholdKey!, e.target.value)}
                          />
                          <span className="text-xs text-gray-600">{rule.thresholdUnit}</span>
                        </div>
                      )}

                      {/* Saved indicator */}
                      {(savedKey === rule.key || savedKey === ('weightKey' in rule ? rule.weightKey : null) || savedKey === ('thresholdKey' in rule ? rule.thresholdKey : null)) && (
                        <span className="text-xs text-green-400 flex-shrink-0">✓</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
