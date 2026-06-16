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
    key: 'SAME_IP_MULTI_ACCOUNT',
    label: 'Flag nhiều tài khoản cùng IP',
    description: 'Đánh dấu nghi ngờ khi 2+ tài khoản dùng cùng IP trong 1 phiên',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_SAME_IP_MULTI_ACCOUNT',
  },
  {
    key: 'BID_SPIKE',
    label: 'Phát hiện bid tăng đột biến',
    description: 'Flag khi bid tăng >50% so với bid liền trước trong vòng 1 giây',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_BID_SPIKE',
  },
  {
    key: 'NEW_ACCOUNT_HIGH_BID',
    label: 'Cảnh báo tài khoản mới bid cao',
    description: 'Flag tài khoản <24h tuổi đặt giá >5× giá khởi điểm ngay lần đầu',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_NEW_ACCOUNT_HIGH_BID',
  },
  {
    key: 'BID_VELOCITY',
    label: 'Giới hạn tốc độ đặt giá',
    description: 'Chặn bot/script — giới hạn số bid mỗi phút',
    category: 'block',
    thresholdKey: 'BID_VELOCITY_MAX',
    thresholdLabel: 'Tối đa N bid / phút',
  },
  {
    key: 'SHILL_BID',
    label: 'Phát hiện shill bidding',
    description: 'Flag khi 1 tài khoản đặt giá ≥3 lần trong 30 giây',
    category: 'flag',
    weightKey: 'FRAUD_WEIGHT_SHILL_BID',
  },
  {
    key: 'DEVICE_MULTI_ACCOUNT',
    label: 'Flag nhiều tài khoản cùng thiết bị',
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
    thresholdLabel: 'Ngưỡng giá (VNĐ)',
  },
  {
    key: 'FRAUD_SCORE_SUSPEND',
    label: 'Tự động khóa khi vượt điểm gian lận',
    description: 'Cộng dồn điểm mỗi lần bid bị flag; vượt ngưỡng → khóa tài khoản',
    category: 'block',
    thresholdKey: 'FRAUD_SCORE_THRESHOLD',
    thresholdLabel: 'Ngưỡng điểm khóa',
  },
  {
    key: 'COOLING_OFF',
    label: 'Thời gian chờ sau khi thắng',
    description: 'Ngăn thắng nhiều phiên cùng danh mục trong khoảng thời gian ngắn',
    category: 'block',
    thresholdKey: 'COOLING_OFF_DAYS',
    thresholdLabel: 'Số ngày cooling-off',
  },
] as const

const CATEGORY_STYLE: Record<string, string> = {
  block: 'bg-red-900/40 text-red-300 border border-red-700',
  flag: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  protection: 'bg-blue-900/40 text-blue-300 border border-blue-700',
}

const CATEGORY_LABEL: Record<string, string> = {
  block: 'Chặn',
  flag: 'Gắn cờ',
  protection: 'Bảo vệ',
}

type Settings = Record<string, string>

export default function FraudSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, startSaving] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
        setMsg({ ok: true, text: 'Đã lưu' })
        setTimeout(() => setMsg(null), 2000)
      } else {
        setMsg({ ok: false, text: 'Lưu thất bại' })
      }
    })
  }

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>

  return (
    <div className="max-w-3xl space-y-6">
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${msg.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {msg.text}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-white">Cài đặt chống gian lận</h1>
        <p className="text-sm text-gray-400 mt-1">Bật/tắt từng rule và điều chỉnh ngưỡng. Hiệu lực sau tối đa 30 giây.</p>
      </div>

      {/* Global thresholds */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ngưỡng toàn cục</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'FRAUD_SCORE_BLOCK_THRESHOLD', label: 'Điểm tối thiểu để chặn bid ngay' },
            { key: 'FRAUD_SCORE_THRESHOLD', label: 'Điểm khóa tài khoản tự động' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-gray-400">{label}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  className="w-24 h-8 px-2 text-sm rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-red-500"
                  value={settings[key] ?? ''}
                  onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                  onBlur={(e) => save(key, e.target.value)}
                />
                <span className="text-xs text-gray-500">điểm</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {RULE_META.map((rule) => {
          const enabled = settings[rule.key] !== 'false'
          return (
            <div key={rule.key} className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-white">{rule.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[rule.category]}`}>
                      {CATEGORY_LABEL[rule.category]}
                    </span>
                    <code className="text-xs text-gray-500 font-mono">{rule.key}</code>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rule.description}</p>
                </div>

                {/* Toggle */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(rule.key, enabled ? 'false' : 'true')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                    enabled ? 'bg-red-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {'weightKey' in rule && rule.weightKey && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
                  <span className="text-xs text-gray-400 flex-1">Điểm gian lận khi kích hoạt</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-20 h-7 px-2 text-xs rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-red-500 disabled:opacity-40"
                      value={settings[rule.weightKey] ?? ''}
                      disabled={!enabled || saving}
                      onChange={(e) => setSettings((p) => ({ ...p, [rule.weightKey!]: e.target.value }))}
                      onBlur={(e) => save(rule.weightKey!, e.target.value)}
                    />
                    <span className="text-xs text-gray-500">điểm</span>
                  </div>
                </div>
              )}

              {'thresholdKey' in rule && rule.thresholdKey && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
                  <span className="text-xs text-gray-400 flex-1">{rule.thresholdLabel}</span>
                  <input
                    type="number"
                    className="w-28 h-7 px-2 text-xs rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-red-500 disabled:opacity-40"
                    value={settings[rule.thresholdKey] ?? ''}
                    disabled={!enabled || saving}
                    onChange={(e) => setSettings((p) => ({ ...p, [rule.thresholdKey!]: e.target.value }))}
                    onBlur={(e) => save(rule.thresholdKey!, e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
