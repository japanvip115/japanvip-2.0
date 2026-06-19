'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Minus, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react'

type FreightRate = {
  id?: string
  minWeightKg: number
  maxWeightKg: number | null
  regularPricePerKg: number
  difficultPricePerKg: number
  estimatedDays: string
  sortOrder: number
}

type RateHistory = {
  id: string
  rate: number
  source: string
  createdAt: string
}

type Props = {
  freightRates: FreightRate[]
  setting: {

    serviceFeeRate: number
    domesticShippingJpy: number
    surchargeRate: number
    depositRate: number
    profitMarginRate: number
    translationProvider: string
    translationApiKeyMasked: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassMasked: string
    smtpFrom: string
    smtpSecure: boolean
  }
  currentRate: number
  rateHistory: RateHistory[]
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30'
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400'

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export function BfjSettingsForm({ setting, freightRates: initialFreightRates, currentRate, rateHistory }: Props) {
  const router = useRouter()

  // Exchange rate
  const [newRate, setNewRate] = useState<string>(String(currentRate))
  const [rateLoading, setRateLoading] = useState(false)
  const [rateMsg, setRateMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Fee settings
  const [serviceFeeRate, setServiceFeeRate] = useState(setting.serviceFeeRate * 100)
  const [domesticShippingJpy, setDomesticShippingJpy] = useState(setting.domesticShippingJpy)
  const [surchargeRate, setSurchargeRate] = useState(setting.surchargeRate * 100)
  const [depositRate, setDepositRate] = useState(setting.depositRate * 100)
  const [profitMarginRate, setProfitMarginRate] = useState(setting.profitMarginRate * 100)

  // Freight rates (bảng cước per kg)
  const [freightRates, setFreightRates] = useState<FreightRate[]>(initialFreightRates)
  const [freightSaving, setFreightSaving] = useState(false)
  const [freightMsg, setFreightMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function updateFreight(index: number, field: keyof FreightRate, value: string | number | null) {
    setFreightRates((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addFreightRow() {
    setFreightRates((prev) => [
      ...prev,
      { minWeightKg: 0, maxWeightKg: null, regularPricePerKg: 0, difficultPricePerKg: 0, estimatedDays: '2-5 ngày', sortOrder: prev.length },
    ])
  }

  async function handleSaveFreight() {
    setFreightSaving(true)
    setFreightMsg(null)
    try {
      const res = await fetch('/api/v1/admin/bfj-freight-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freightRates.map((r, i) => ({ ...r, sortOrder: i }))),
      })
      const data = await res.json()
      if (data.success) {
        setFreightMsg({ ok: true, text: 'Đã lưu bảng cước' })
        router.refresh()
      } else {
        setFreightMsg({ ok: false, text: data.error ?? 'Lỗi lưu' })
      }
    } catch {
      setFreightMsg({ ok: false, text: 'Không thể kết nối' })
    } finally {
      setFreightSaving(false)
    }
  }

  // Translation settings
  const [translationProvider, setTranslationProvider] = useState(setting.translationProvider)
  const [translationApiKey, setTranslationApiKey] = useState(setting.translationApiKeyMasked)
  const [testingTranslation, setTestingTranslation] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  // SMTP settings
  const [smtpHost, setSmtpHost] = useState(setting.smtpHost)
  const [smtpPort, setSmtpPort] = useState(String(setting.smtpPort))
  const [smtpUser, setSmtpUser] = useState(setting.smtpUser)
  const [smtpPass, setSmtpPass] = useState(setting.smtpPassMasked)
  const [smtpFrom, setSmtpFrom] = useState(setting.smtpFrom)
  const [smtpSecure, setSmtpSecure] = useState(setting.smtpSecure)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [sendTestTo, setSendTestTo] = useState('')
  const [sendTestResult, setSendTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleUpdateRate() {
    const r = parseFloat(newRate)
    if (isNaN(r) || r <= 0) return
    setRateLoading(true)
    setRateMsg(null)
    try {
      const res = await fetch('/api/v1/admin/settings/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'JPY', to: 'VND', rate: r }),
      })
      const data = await res.json()
      if (data.success) {
        setRateMsg({ ok: true, text: `Đã cập nhật: 1 JPY = ${fmt(r)} ₫` })
        router.refresh()
      } else {
        setRateMsg({ ok: false, text: data.error ?? 'Lỗi cập nhật tỷ giá' })
      }
    } catch {
      setRateMsg({ ok: false, text: 'Không thể kết nối' })
    } finally {
      setRateLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const [r1] = await Promise.all([
        fetch('/api/v1/admin/bfj-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceFeeRate: serviceFeeRate / 100,
            domesticShippingJpy,
            surchargeRate: surchargeRate / 100,
            depositRate: depositRate / 100,
            profitMarginRate: profitMarginRate / 100,
            translationProvider,
            translationApiKey,
            smtpHost: smtpHost || null,
            smtpPort: parseInt(smtpPort, 10) || 465,
            smtpUser: smtpUser || null,
            smtpPass,
            smtpFrom: smtpFrom || null,
            smtpSecure,
          }),
        }),
      ])
      if (r1.ok) {
        setSaveMsg({ ok: true, text: 'Đã lưu tất cả cài đặt' })
        router.refresh()
      } else {
        setSaveMsg({ ok: false, text: 'Có lỗi khi lưu, vui lòng thử lại' })
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Không thể kết nối' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestTranslation() {
    setTestingTranslation(true)
    setTestResult(null)
    try {
      // Save first so the key is persisted, then test
      await fetch('/api/v1/admin/bfj-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translationProvider, translationApiKey }),
      })
      const res = await fetch('/api/v1/admin/bfj-settings/test-translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'パナソニック NA-VX9900L ドラム式洗濯乾燥機 10kg ホワイト' }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult({ ok: true, text: `✓ Kết quả: "${data.translated}"` })
      } else {
        setTestResult({ ok: false, text: data.error ?? 'Lỗi không xác định' })
      }
    } catch {
      setTestResult({ ok: false, text: 'Không thể kết nối' })
    } finally {
      setTestingTranslation(false)
    }
  }

  async function handleTestSmtp() {
    setTestingSmtp(true)
    setSmtpTestResult(null)
    try {
      // Save first so we test the latest values
      await fetch('/api/v1/admin/bfj-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost, smtpPort: parseInt(smtpPort, 10) || 465,
          smtpUser, smtpPass, smtpFrom, smtpSecure,
        }),
      })
      const res = await fetch('/api/v1/admin/bfj-settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost, port: parseInt(smtpPort, 10) || 465,
          user: smtpUser, pass: smtpPass, from: smtpFrom, secure: smtpSecure,
        }),
      })
      const data = await res.json()
      setSmtpTestResult({ ok: data.success, text: data.success ? data.message : data.error })
    } catch {
      setSmtpTestResult({ ok: false, text: 'Không thể kết nối máy chủ' })
    } finally {
      setTestingSmtp(false)
    }
  }

  async function handleSendTestEmail() {
    if (!sendTestTo) return
    setSendingTest(true)
    setSendTestResult(null)
    try {
      const res = await fetch('/api/v1/admin/bfj-settings/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost, port: parseInt(smtpPort, 10) || 465,
          user: smtpUser, pass: smtpPass, from: smtpFrom, secure: smtpSecure,
          to: sendTestTo,
        }),
      })
      const data = await res.json()
      setSendTestResult({ ok: data.success, text: data.success ? data.message : data.error })
    } catch {
      setSendTestResult({ ok: false, text: 'Không thể kết nối' })
    } finally {
      setSendingTest(false)
    }
  }

  const rateChange = currentRate > 0 ? ((parseFloat(newRate) - currentRate) / currentRate) * 100 : 0

  return (
    <div className="space-y-5">

      {/* ── Section 1: Tỷ giá ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-200">Tỷ giá JPY → VND</h2>
          <p className="mt-0.5 text-xs text-gray-500">Áp dụng ngay cho tất cả ước tính phí mới</p>
        </div>

        <div className="p-5">
          {/* Current rate display */}
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-gray-900 px-5 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Tỷ giá hiện tại</p>
              <p className="text-2xl font-bold text-yellow-400 tabular-nums">
                1 JPY = {fmt(currentRate)} ₫
              </p>
            </div>
          </div>

          {/* Rate update inline */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className={LABEL_CLS}>Tỷ giá mới (1 JPY = ? VND)</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
                <span className="text-xs text-gray-500">1 JPY =</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateRate()}
                  className="flex-1 bg-transparent text-sm text-gray-100 outline-none tabular-nums"
                />
                <span className="text-xs text-gray-500">₫</span>
                {parseFloat(newRate) !== currentRate && !isNaN(parseFloat(newRate)) && (
                  <span className={`text-xs font-medium ${rateChange > 0 ? 'text-green-400' : rateChange < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {rateChange > 0 ? '+' : ''}{rateChange.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpdateRate}
              disabled={rateLoading || parseFloat(newRate) === currentRate}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {rateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Cập nhật
            </button>
          </div>

          {rateMsg && (
            <div className={`mt-2.5 flex items-center gap-1.5 text-xs ${rateMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {rateMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {rateMsg.text}
            </div>
          )}

          {/* Rate history */}
          {rateHistory.length > 0 && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">Lịch sử thay đổi gần nhất</p>
              <div className="space-y-1.5">
                {rateHistory.slice(0, 5).map((h, i) => {
                  const prev = rateHistory[i + 1]
                  const diff = prev ? h.rate - prev.rate : 0
                  return (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-200 tabular-nums">1 JPY = {fmt(h.rate)} ₫</span>
                      <div className="flex items-center gap-2">
                        {diff > 0 ? <TrendingUp className="h-3 w-3 text-green-400" /> :
                         diff < 0 ? <TrendingDown className="h-3 w-3 text-red-400" /> :
                         <Minus className="h-3 w-3 text-gray-600" />}
                        <span className="text-gray-600">
                          {new Date(h.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Cài đặt phí ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-200">Cài đặt phí dịch vụ</h2>
        <p className="mb-4 text-xs text-gray-500">Áp dụng cho tất cả đơn mua hộ mới</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLS}>Phí mua hộ (%)</label>
            <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 focus-within:border-red-500">
              <input
                type="number" min="0" max="100" step="0.5"
                value={serviceFeeRate}
                onChange={(e) => setServiceFeeRate(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-gray-100 outline-none tabular-nums"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">% tính trên giá sản phẩm JPY → VND</p>
          </div>

          <div>
            <label className={LABEL_CLS}>Phí nội địa Nhật (¥)</label>
            <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 focus-within:border-red-500">
              <span className="mr-1.5 text-xs text-gray-500">¥</span>
              <input
                type="number" min="0" step="100"
                value={domesticShippingJpy}
                onChange={(e) => setDomesticShippingJpy(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-gray-100 outline-none tabular-nums"
              />
            </div>
            <p className="mt-1 text-xs text-gray-600">Phí kho Nhật, 0 = miễn phí</p>
          </div>

          <div>
            <label className={LABEL_CLS}>Phụ thu (%)</label>
            <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 focus-within:border-red-500">
              <input
                type="number" min="0" max="100" step="0.5"
                value={surchargeRate}
                onChange={(e) => setSurchargeRate(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-gray-100 outline-none tabular-nums"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">Phụ thu thêm (thuế, bảo hiểm, v.v.)</p>
          </div>

          <div>
            <label className={LABEL_CLS}>Đặt cọc tối thiểu (%)</label>
            <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 focus-within:border-red-500">
              <input
                type="number" min="0" max="100" step="5"
                value={depositRate}
                onChange={(e) => setDepositRate(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-gray-100 outline-none tabular-nums"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">% đặt cọc khi tạo đơn</p>
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL_CLS}>Lợi nhuận mục tiêu (%)</label>
            <div className="flex items-center rounded-lg border border-yellow-600/40 bg-yellow-900/20 px-3 py-2 focus-within:border-yellow-500">
              <input
                type="number" min="0" max="100" step="0.5"
                value={profitMarginRate}
                onChange={(e) => setProfitMarginRate(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-yellow-200 outline-none tabular-nums"
              />
              <span className="text-xs text-yellow-600">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">Markup nội bộ trên giá sản phẩm — không hiển thị thành dòng riêng cho khách</p>
          </div>
        </div>

        {/* Preview row */}
        <div className="mt-4 rounded-lg border border-gray-700/50 bg-gray-900/60 px-4 py-3">
          <p className="mb-1.5 text-xs font-medium text-gray-500">Ví dụ: Sản phẩm ¥10,000 × tỷ giá {fmt(currentRate)} = {fmt(10000 * currentRate)}₫</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-400">Phí mua hộ: <span className="text-white">{fmt(Math.round(10000 * currentRate * serviceFeeRate / 100))}₫</span></span>
            {surchargeRate > 0 && <span className="text-gray-400">Phụ thu: <span className="text-white">{fmt(Math.round(10000 * currentRate * surchargeRate / 100))}₫</span></span>}
            {profitMarginRate > 0 && <span className="text-yellow-500">Lợi nhuận: <span className="text-yellow-300">{fmt(Math.round(10000 * currentRate * profitMarginRate / 100))}₫</span></span>}
            {domesticShippingJpy > 0 && <span className="text-gray-400">Nội địa JP: <span className="text-white">¥{domesticShippingJpy}</span></span>}
          </div>
        </div>
      </div>

      {/* ── Section 3: Bảng cước vận chuyển JP → HN (per kg) ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">✈ Bảng Cước Vận Chuyển JP → HN (per kg)</h2>
            <p className="mt-0.5 text-xs text-gray-500">Giá/kg theo trọng lượng — Hàng Thường vs Hàng Khó</p>
          </div>
          <button
            type="button"
            onClick={addFreightRow}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm mức
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Từ (kg)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Đến (kg)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hàng Thường (₫/kg)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hàng Khó (₫/kg)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {freightRates.map((rate, i) => (
                <tr key={i} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min="0" step="1"
                      value={rate.minWeightKg}
                      onChange={(e) => updateFreight(i, 'minWeightKg', Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-blue-500 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number" min="0" step="1"
                      value={rate.maxWeightKg ?? ''}
                      onChange={(e) => updateFreight(i, 'maxWeightKg', e.target.value ? Number(e.target.value) : null)}
                      placeholder="∞"
                      className="w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-blue-500 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-0.5">
                      <input
                        type="number" min="0" step="1000"
                        value={rate.regularPricePerKg}
                        onChange={(e) => updateFreight(i, 'regularPricePerKg', Number(e.target.value))}
                        className="w-28 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-green-500 tabular-nums"
                      />
                      {rate.regularPricePerKg > 0 && <p className="text-[10px] text-gray-500">{fmt(rate.regularPricePerKg)}₫</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-0.5">
                      <input
                        type="number" min="0" step="1000"
                        value={rate.difficultPricePerKg}
                        onChange={(e) => updateFreight(i, 'difficultPricePerKg', Number(e.target.value))}
                        className="w-28 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-orange-500 tabular-nums"
                      />
                      {rate.difficultPricePerKg > 0 && <p className="text-[10px] text-gray-500">{fmt(rate.difficultPricePerKg)}₫</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={rate.estimatedDays}
                      onChange={(e) => updateFreight(i, 'estimatedDays', e.target.value)}
                      className="w-24 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setFreightRates((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-700 px-5 py-3">
          <button
            type="button"
            onClick={handleSaveFreight}
            disabled={freightSaving}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {freightSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {freightSaving ? 'Đang lưu...' : 'Lưu bảng cước'}
          </button>
          {freightMsg && (
            <div className={`flex items-center gap-1.5 text-xs ${freightMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {freightMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {freightMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 5: Translation API ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-200">🌐 Tích Hợp Dịch Thuật</h2>
          <p className="mt-0.5 text-xs text-gray-500">Tự động dịch tên sản phẩm sang tiếng Việt khi khách dán link</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Provider selector */}
          <div>
            <label className={LABEL_CLS}>Dịch vụ dịch thuật</label>
            <div className="flex gap-3">
              {([
                { value: 'none', label: 'Không dịch' },
                { value: 'anthropic', label: 'Anthropic Claude' },
                { value: 'google-free', label: 'Google (Miễn phí)' },
                { value: 'google', label: 'Google Cloud API' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTranslationProvider(opt.value); setTestResult(null) }}
                  className={`flex-1 cursor-pointer rounded-lg border py-2 text-sm font-medium transition-colors ${
                    translationProvider === opt.value
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {translationProvider === 'google-free' && (
            <div className="rounded-lg border border-green-700/40 bg-green-900/20 px-4 py-3">
              <p className="text-xs text-green-400 font-medium mb-1">✓ Không cần API Key — miễn phí hoàn toàn</p>
              <p className="text-xs text-gray-500">Dùng Google Translate unofficial API. Phù hợp dịch tên sản phẩm lẻ. Nếu server bị rate-limit thì chuyển sang Google Cloud API.</p>
              <button
                type="button"
                onClick={handleTestTranslation}
                disabled={testingTranslation}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-gray-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {testingTranslation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Test thử
              </button>
              {testResult && (
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {testResult.text}
                </div>
              )}
            </div>
          )}

          {(translationProvider === 'anthropic' || translationProvider === 'google') && (
            <div>
              <label className={LABEL_CLS}>
                {translationProvider === 'anthropic' ? 'Anthropic API Key' : 'Google Cloud API Key'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={translationApiKey}
                  onChange={(e) => { setTranslationApiKey(e.target.value); setTestResult(null) }}
                  placeholder={translationProvider === 'anthropic' ? 'sk-ant-api03-...' : 'AIza...'}
                  className={INPUT_CLS + ' flex-1'}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleTestTranslation}
                  disabled={testingTranslation || !translationApiKey || translationApiKey.includes('•')}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-gray-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {testingTranslation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Test
                </button>
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                {translationProvider === 'anthropic'
                  ? 'Lấy tại console.anthropic.com → API Keys. Model sử dụng: claude-haiku (nhanh, rẻ).'
                  : 'Lấy tại console.cloud.google.com → APIs → Cloud Translation API → Credentials.'}
              </p>

              {testResult && (
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {testResult.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 6: Email SMTP ── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-200">📧 Email SMTP</h2>
          <p className="mt-0.5 text-xs text-gray-500">Cấu hình server gửi email — OTP xác thực, báo giá, thông báo đơn hàng</p>
        </div>
        <div className="p-5 space-y-4">

          {/* Host + Port + Secure */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => { setSmtpHost(e.target.value); setSmtpTestResult(null) }}
                placeholder="mail.japanvip.vn hoặc smtp.gmail.com"
                className={INPUT_CLS}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-600">cPanel: mail.domain.com • Gmail: smtp.gmail.com • Zoho: smtp.zoho.com</p>
            </div>
            <div>
              <label className={LABEL_CLS}>Port</label>
              <select
                value={smtpPort}
                onChange={(e) => { setSmtpPort(e.target.value); setSmtpSecure(e.target.value === '465'); setSmtpTestResult(null) }}
                className={INPUT_CLS}
              >
                <option value="465">465 (SSL)</option>
                <option value="587">587 (TLS)</option>
                <option value="25">25 (Plain)</option>
              </select>
            </div>
          </div>

          {/* User + Pass */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLS}>Email đăng nhập (Username)</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => { setSmtpUser(e.target.value); setSmtpTestResult(null) }}
                placeholder="info@japanvip.vn"
                className={INPUT_CLS}
                autoComplete="off"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Mật khẩu email / App Password</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => { setSmtpPass(e.target.value); setSmtpTestResult(null) }}
                placeholder="••••••••••••"
                className={INPUT_CLS}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-600">Gmail: dùng App Password (bật 2FA trước)</p>
            </div>
          </div>

          {/* From */}
          <div>
            <label className={LABEL_CLS}>Tên hiển thị người gửi (From)</label>
            <input
              type="text"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder='Japan VIP <info@japanvip.vn>'
              className={INPUT_CLS}
            />
            <p className="mt-1 text-xs text-gray-600">Format: Tên Hiển Thị &lt;email@domain.com&gt;</p>
          </div>

          {/* Secure toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSmtpSecure(!smtpSecure)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${smtpSecure ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${smtpSecure ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-gray-300">
              SSL/TLS {smtpSecure ? <span className="text-green-400 text-xs">(bật — khuyến nghị với port 465)</span> : <span className="text-yellow-400 text-xs">(tắt — dùng với port 587/STARTTLS)</span>}
            </span>
          </div>

          {/* Test button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp || !smtpHost || !smtpUser || !smtpPass || smtpPass.includes('•')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-gray-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {testingSmtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🔌</span>}
              Kiểm tra kết nối
            </button>
            <p className="text-xs text-gray-600">Lưu trước khi test nếu vừa thay đổi mật khẩu</p>
          </div>

          {smtpTestResult && (
            <div className={`rounded-lg px-3 py-2 text-xs ${smtpTestResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {smtpTestResult.ok ? '✓ ' : '✗ '}{smtpTestResult.text}
            </div>
          )}

          {/* Send test email */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="email"
              value={sendTestTo}
              onChange={(e) => setSendTestTo(e.target.value)}
              placeholder="Gửi email thử tới..."
              className={INPUT_CLS + ' flex-1'}
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTest || !sendTestTo || !smtpHost || !smtpUser || !smtpPass}
              className="whitespace-nowrap flex items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-900/40 px-4 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-800/40 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>📧</span>}
              Gửi thử
            </button>
          </div>
          {sendTestResult && (
            <div className={`rounded-lg px-3 py-2 text-xs ${sendTestResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {sendTestResult.ok ? '✓ ' : '✗ '}{sendTestResult.text}
            </div>
          )}

          {/* Quick presets */}
          <div className="border-t border-gray-700 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Mẫu cấu hình phổ biến</p>
            <div className="flex flex-wrap gap-2">
              {([
                { label: 'cPanel Hosting', host: 'mail.japanvip.vn', port: '465', secure: true },
                { label: 'Gmail', host: 'smtp.gmail.com', port: '587', secure: false },
                { label: 'Zoho Mail', host: 'smtp.zoho.com', port: '465', secure: true },
                { label: 'Outlook/M365', host: 'smtp.office365.com', port: '587', secure: false },
                { label: 'AWS SES (US)', host: 'email-smtp.us-east-1.amazonaws.com', port: '587', secure: false },
                { label: 'AWS SES (Singapore)', host: 'email-smtp.ap-southeast-1.amazonaws.com', port: '587', secure: false },
              ] as const).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => { setSmtpHost(preset.host); setSmtpPort(String(preset.port)); setSmtpSecure(preset.secure); setSmtpTestResult(null) }}
                  className="rounded-md border border-dashed border-gray-600 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Save button ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>

        {saveMsg && (
          <div className={`flex items-center gap-1.5 text-sm ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {saveMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {saveMsg.text}
          </div>
        )}
      </div>
    </div>
  )
}
