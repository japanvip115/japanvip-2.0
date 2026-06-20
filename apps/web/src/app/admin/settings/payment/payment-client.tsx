'use client'

import { useEffect, useState } from 'react'
import { Save, ShieldCheck, ExternalLink, Eye, EyeOff, QrCode } from 'lucide-react'
import { VietQRCode } from '@/components/payment/viet-qr-code'

// VN banks list cho dropdown
const VN_BANKS = [
  // Big 4 + phổ biến nhất
  { id: 'MB',       name: 'MB Bank' },
  { id: 'VCB',      name: 'Vietcombank' },
  { id: 'TCB',      name: 'Techcombank' },
  { id: 'ACB',      name: 'ACB' },
  { id: 'VPB',      name: 'VPBank' },
  { id: 'BIDV',     name: 'BIDV' },
  { id: 'CTG',      name: 'VietinBank (CTG)' },
  { id: 'AGR',      name: 'Agribank' },
  // Phổ biến
  { id: 'TPB',      name: 'TPBank' },
  { id: 'STB',      name: 'Sacombank' },
  { id: 'MSB',      name: 'MSB' },
  { id: 'OCB',      name: 'OCB' },
  { id: 'SHB',      name: 'SHB' },
  { id: 'HDB',      name: 'HDBank' },
  { id: 'VIB',      name: 'VIB' },
  { id: 'EIB',      name: 'Eximbank' },
  { id: 'SSB',      name: 'SeABank' },
  { id: 'LPB',      name: 'LienVietPostBank' },
  { id: 'NVB',      name: 'NamABank' },
  { id: 'VAB',      name: 'VietABank' },
  { id: 'ABB',      name: 'ABBank' },
  { id: 'BAB',      name: 'BacABank' },
  { id: 'BVB',      name: 'BaoVietBank' },
  { id: 'CBB',      name: 'CB Bank' },
  { id: 'GPB',      name: 'GPBank' },
  { id: 'IVB',      name: 'IndovinaBank' },
  { id: 'KLB',      name: 'KienLongBank' },
  { id: 'MBV',      name: 'MB Ageas Life' },
  { id: 'OJB',      name: 'OceanBank' },
  { id: 'PGB',      name: 'PGBank' },
  { id: 'PVCB',     name: 'PVcomBank' },
  { id: 'SCB',      name: 'SCB' },
  { id: 'SGICB',    name: 'SaigonBank' },
  { id: 'SGB',      name: 'SGB' },
  { id: 'VBB',      name: 'VietBank' },
  { id: 'VCCB',     name: 'VietCapitalBank' },
  { id: 'VDB',      name: 'VDB' },
  { id: 'WVN',      name: 'Woori Bank VN' },
  // Neo bank / fintech
  { id: 'CAKE',     name: 'CAKE by VPBank' },
  { id: 'UBANK',    name: 'Ubank by VPBank' },
  { id: 'TIMO',     name: 'Timo' },
  { id: 'COOPBANK', name: 'Co-op Bank' },
]

type VnpayStatus = { tmnCode: string; hasHashSecret: boolean; payUrl: string; returnUrl: string; enabled: boolean }
type VietQRStatus = { bankId: string; accountNo: string; accountName: string; enabled: boolean }

export function PaymentSettingsClient() {
  // VNPay
  const [tmnCode, setTmnCode] = useState('')
  const [hashSecret, setHashSecret] = useState('')
  const [payUrl, setPayUrl] = useState('')
  const [returnUrl, setReturnUrl] = useState('')
  const [vnpayEnabled, setVnpayEnabled] = useState(false)
  const [hasSecret, setHasSecret] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [vnpaySaving, setVnpaySaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // VietQR
  const [bankId, setBankId] = useState('MB')
  const [accountNo, setAccountNo] = useState('')
  const [accountName, setAccountName] = useState('')
  const [vietqrEnabled, setVietqrEnabled] = useState(true)
  const [vietqrSaving, setVietqrSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/settings/payment')
      .then((r) => r.json())
      .then((d: { vnpay: VnpayStatus; vietqr: VietQRStatus }) => {
        if (d.vnpay) {
          setTmnCode(d.vnpay.tmnCode)
          setPayUrl(d.vnpay.payUrl)
          setReturnUrl(d.vnpay.returnUrl)
          setVnpayEnabled(d.vnpay.enabled)
          setHasSecret(d.vnpay.hasHashSecret)
        }
        if (d.vietqr) {
          if (d.vietqr.bankId) setBankId(d.vietqr.bankId)
          setAccountNo(d.vietqr.accountNo)
          setAccountName(d.vietqr.accountName)
          setVietqrEnabled(d.vietqr.enabled)
        }
      })
      .catch(() => {})
  }, [])

  async function saveVnpay() {
    setVnpaySaving('saving')
    const res = await fetch('/api/v1/admin/settings/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway: 'vnpay', tmnCode, hashSecret, payUrl, returnUrl, enabled: vnpayEnabled }),
    })
    const data = await res.json()
    if (data.success) {
      setVnpaySaving('saved')
      if (hashSecret) { setHasSecret(true); setHashSecret('') }
      setTimeout(() => setVnpaySaving('idle'), 2500)
    } else {
      setVnpaySaving('error')
    }
  }

  async function saveVietQR() {
    setVietqrSaving('saving')
    const res = await fetch('/api/v1/admin/settings/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway: 'vietqr', bankId, accountNo, accountName, enabled: vietqrEnabled }),
    })
    const data = await res.json()
    if (data.success) {
      setVietqrSaving('saved')
      setTimeout(() => setVietqrSaving('idle'), 2500)
    } else {
      setVietqrSaving('error')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Cổng thanh toán</h1>
        <p className="text-xs text-gray-500 mt-0.5">Cấu hình các phương thức thanh toán cho khách hàng.</p>
      </div>

      {/* VietQR */}
      <div className="rounded-lg border border-green-700/50 bg-green-900/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/50">
          <QrCode className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-gray-200 text-sm">VietQR — Chuyển khoản ngân hàng</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-green-800 text-green-300 font-medium">Miễn phí</span>
          <label className="ml-auto flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={vietqrEnabled} onChange={(e) => setVietqrEnabled(e.target.checked)} className="accent-green-500" />
            {vietqrEnabled ? 'Đang bật' : 'Đang tắt'}
          </label>
        </div>

        <div className="px-5 py-4 space-y-4">
          <Field label="Ngân hàng">
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none focus:border-green-500"
            >
              {VN_BANKS.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Số tài khoản">
            <input
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="VD: 0988969896"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-green-500"
            />
          </Field>

          <Field label="Tên chủ tài khoản (không dấu, in hoa)">
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN THI GIANG"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white placeholder-gray-700 outline-none focus:border-green-500"
            />
          </Field>

          {/* Preview QR */}
          {accountNo && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-xs text-green-400 hover:text-green-300 underline"
              >
                {showPreview ? 'Ẩn preview QR' : 'Xem thử QR'}
              </button>
              {showPreview && (
                <div className="mt-3 flex justify-center">
                  <VietQRCode
                    bankId={bankId}
                    accountNo={accountNo}
                    accountName={accountName}
                    amount={100000}
                    addInfo="PREVIEW TEST"
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-gray-900/60 border border-gray-700 px-3 py-2.5 text-[11px] text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300">ℹ VietQR hoạt động như thế nào?</p>
            <p>Sinh mã QR động theo từng đơn hàng (số tiền + nội dung CK tự điền). Khách dùng app ngân hàng quét là xong — không qua cổng trung gian, không phí giao dịch.</p>
          </div>

          <button
            onClick={saveVietQR}
            disabled={vietqrSaving === 'saving' || !accountNo.trim()}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
              vietqrSaving === 'saved' ? 'bg-green-600 text-white' : vietqrSaving === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Save className="h-4 w-4" />
            {vietqrSaving === 'saving' ? 'Đang lưu...' : vietqrSaving === 'saved' ? '✓ Đã lưu' : vietqrSaving === 'error' ? '✕ Lỗi' : 'Lưu VietQR'}
          </button>
        </div>
      </div>

      {/* VNPay */}
      <div className="rounded-lg border border-blue-700/50 bg-blue-900/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/50">
          <span className="text-base">🏦</span>
          <span className="font-semibold text-gray-200 text-sm">VNPay</span>
          <a href="https://sandbox.vnpayment.vn/apis/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <label className="ml-auto flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={vnpayEnabled} onChange={(e) => setVnpayEnabled(e.target.checked)} className="accent-purple-600" />
            {vnpayEnabled ? 'Đang bật' : 'Đang tắt'}
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
            onClick={saveVnpay}
            disabled={vnpaySaving === 'saving' || (!hasSecret && !hashSecret.trim()) || !tmnCode.trim()}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
              vnpaySaving === 'saved' ? 'bg-green-600 text-white' : vnpaySaving === 'error' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <Save className="h-4 w-4" />
            {vnpaySaving === 'saving' ? 'Đang lưu...' : vnpaySaving === 'saved' ? '✓ Đã lưu' : vnpaySaving === 'error' ? '✕ Lỗi' : 'Lưu VNPay'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4 text-[11px] text-gray-500 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        VNPay HashSecret mã hoá AES-256-GCM · VietQR không lưu dữ liệu nhạy cảm · Callback VNPay verify HMAC-SHA512
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
