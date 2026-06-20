'use client'

import { useEffect, useState } from 'react'
import { Save, ShieldCheck, ExternalLink, Eye, EyeOff } from 'lucide-react'

type VnpayStatus = {
  tmnCode: string
  hasHashSecret: boolean
  payUrl: string
  returnUrl: string
  enabled: boolean
}

export function PaymentSettingsClient() {
  const [tmnCode, setTmnCode] = useState('')
  const [hashSecret, setHashSecret] = useState('')
  const [payUrl, setPayUrl] = useState('')
  const [returnUrl, setReturnUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [hasSecret, setHasSecret] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/v1/admin/settings/payment')
      .then((r) => r.json())
      .then((d: { vnpay: VnpayStatus }) => {
        if (!d.vnpay) return
        setTmnCode(d.vnpay.tmnCode)
        setPayUrl(d.vnpay.payUrl)
        setReturnUrl(d.vnpay.returnUrl)
        setEnabled(d.vnpay.enabled)
        setHasSecret(d.vnpay.hasHashSecret)
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving('saving')
    const res = await fetch('/api/v1/admin/settings/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmnCode, hashSecret, payUrl, returnUrl, enabled }),
    })
    const data = await res.json()
    if (data.success) {
      setSaving('saved')
      if (hashSecret) { setHasSecret(true); setHashSecret('') }
      setTimeout(() => setSaving('idle'), 2500)
    } else {
      setSaving('error')
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Cổng thanh toán</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          HashSecret được mã hoá <strong className="text-gray-400">AES-256-GCM</strong> trước khi lưu DB.
        </p>
      </div>

      <div className="rounded-lg border border-blue-700/50 bg-blue-900/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/50">
          <span className="text-base">🏦</span>
          <span className="font-semibold text-gray-200 text-sm">VNPay</span>
          <a href="https://sandbox.vnpayment.vn/apis/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <label className="ml-auto flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-purple-600" />
            {enabled ? 'Đang bật' : 'Đang tắt'}
          </label>
        </div>

        <div className="px-5 py-4 space-y-4">
          <Field label="Terminal ID (vnp_TmnCode)">
            <input value={tmnCode} onChange={(e) => setTmnCode(e.target.value)} placeholder="VD: 2QXUI4J4"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500" />
          </Field>

          <Field label={`HashSecret ${hasSecret ? '(đã lưu — để trống nếu không đổi)' : '(bắt buộc)'}`}>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={hashSecret}
                onChange={(e) => setHashSecret(e.target.value)}
                placeholder={hasSecret ? '••••••••••••••••' : 'Dán HashSecret từ VNPay'}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 pr-9 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500"
              />
              <button type="button" onClick={() => setShowSecret((v) => !v)} className="absolute right-2.5 top-2.5 text-gray-600 hover:text-gray-400">
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>

          <Field label="Pay URL">
            <input value={payUrl} onChange={(e) => setPayUrl(e.target.value)} placeholder="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500" />
            <p className="mt-1 text-[11px] text-gray-600">Sandbox: <code>https://sandbox.vnpayment.vn/paymentv2/vpcpay.html</code> · Production: <code>https://vnpayment.vn/paymentv2/vpcpay.html</code></p>
          </Field>

          <Field label="Return URL (trang khách quay về sau thanh toán)">
            <input value={returnUrl} onChange={(e) => setReturnUrl(e.target.value)} placeholder="https://store.japanvip.vn/payment/vnpay-return"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-purple-500" />
          </Field>

          <div className="rounded-lg bg-gray-900/60 border border-gray-700 px-3 py-2.5 text-[11px] text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300">⚙ Cấu hình IPN trong cổng VNPay:</p>
            <p>URL IPN: <code className="text-orange-300">https://store.japanvip.vn/api/v1/webhooks/vnpay</code></p>
            <p>Đây là endpoint server-to-server xác nhận thanh toán (bắt buộc để cập nhật trạng thái đơn).</p>
          </div>

          <button
            onClick={save}
            disabled={saving === 'saving' || (!hasSecret && !hashSecret.trim()) || !tmnCode.trim()}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
              saving === 'saved' ? 'bg-green-600 text-white' : saving === 'error' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <Save className="h-4 w-4" />
            {saving === 'saving' ? 'Đang lưu...' : saving === 'saved' ? '✓ Đã lưu' : saving === 'error' ? '✕ Lỗi' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4 text-[11px] text-gray-500 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        HashSecret mã hoá AES-256-GCM · Mọi callback đều verify chữ ký HMAC-SHA512 · IPN idempotent theo mã giao dịch
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-400">{label}</label>
      {children}
    </div>
  )
}
