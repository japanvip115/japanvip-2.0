'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react'

type Props = {
  googleVerification: string
  bingVerification: string
  facebookVerification: string
  facebookPixelId: string
  ga4Id: string
}

export function VerificationSettingsForm({ googleVerification, bingVerification, facebookVerification, facebookPixelId, ga4Id }: Props) {
  const [google, setGoogle] = useState(googleVerification)
  const [bing, setBing] = useState(bingVerification)
  const [facebook, setFacebook] = useState(facebookVerification)
  const [pixel, setPixel] = useState(facebookPixelId)
  const [ga4, setGa4] = useState(ga4Id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Cho dán cả thẻ <meta ...> — tự bóc lấy content
  function extractContent(input: string): string {
    const m = input.match(/content=["']([^"']+)["']/i)
    return (m?.[1] ?? input).trim()
  }

  // Pixel ID là dãy số 15–16 chữ số — cho dán cả đoạn fbq('init','...') vẫn bóc ra được
  function extractPixelId(input: string): string {
    const init = input.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,})['"]/i)
    if (init) return init[1]!
    const digits = input.match(/\d{6,}/)
    return (digits ? digits[0] : input).trim()
  }

  // GA4 Measurement ID dạng G-XXXXXXX — cho dán cả đoạn gtag vẫn bóc ra được
  function extractGa4Id(input: string): string {
    const m = input.match(/G-[A-Z0-9]{6,}/i)
    return (m ? m[0].toUpperCase() : input).trim()
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/v1/admin/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_google_verification: extractContent(google),
          site_bing_verification: extractContent(bing),
          site_facebook_verification: extractContent(facebook),
          site_facebook_pixel_id: extractPixelId(pixel),
          site_ga4_id: extractGa4Id(ga4),
        }),
      })
      if (res.ok) {
        setGoogle(extractContent(google))
        setBing(extractContent(bing))
        setFacebook(extractContent(facebook))
        setPixel(extractPixelId(pixel))
        setGa4(extractGa4Id(ga4))
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔍</span>
          <h2 className="font-semibold text-white">Google Search Console</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Vào Search Console → Cài đặt → Xác minh quyền sở hữu → chọn <b>Thẻ HTML</b>, dán cả thẻ
          <code className="mx-1 rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">&lt;meta name="google-site-verification" ...&gt;</code>
          hoặc chỉ mã content vào đây — hệ thống tự gắn vào <code className="rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">&lt;head&gt;</code> mọi trang.
        </p>
        <input
          value={google}
          onChange={e => setGoogle(e.target.value)}
          placeholder='Dán mã hoặc cả thẻ <meta name="google-site-verification" content="...">'
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
        />
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🅱️</span>
          <h2 className="font-semibold text-white">Bing Webmaster (tùy chọn)</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Mã xác minh Bing (thẻ <code className="rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">msvalidate.01</code>). Bỏ trống nếu không dùng.
        </p>
        <input
          value={bing}
          onChange={e => setBing(e.target.value)}
          placeholder='Dán mã hoặc cả thẻ <meta name="msvalidate.01" content="...">'
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
        />
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📘</span>
          <h2 className="font-semibold text-white">Facebook Domain Verification (tùy chọn)</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Vào Meta Business Suite → Bảo mật thương hiệu → Miền → thêm domain, chọn <b>Thẻ Meta</b>, dán mã
          <code className="mx-1 rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">facebook-domain-verification</code>
          để chạy quảng cáo & gắn Pixel chuẩn.
        </p>
        <input
          value={facebook}
          onChange={e => setFacebook(e.target.value)}
          placeholder='Dán mã hoặc cả thẻ <meta name="facebook-domain-verification" content="...">'
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
        />
      </div>

      <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎯</span>
          <h2 className="font-semibold text-white">Meta Pixel <span className="text-xs font-normal text-blue-300/80">(Tracking + Remarketing)</span></h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Nhập <b className="text-gray-300">Pixel ID</b> (dãy 15–16 chữ số) từ Meta Events Manager → hệ thống tự chèn mã <code className="rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">fbq</code> theo dõi vào mọi trang.
          Pixel này dùng cho cả đo chuyển đổi <b className="text-gray-300">lẫn xây tệp remarketing</b> — không cần mã riêng.
        </p>
        <input
          value={pixel}
          onChange={e => setPixel(e.target.value)}
          placeholder="VD: 1234567890123456 — hoặc dán cả đoạn fbq('init','...')"
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
        />
        <p className="mt-1.5 text-[11px] text-gray-600">Lấy tại: business.facebook.com → Trình quản lý sự kiện (Events Manager) → chọn Pixel → ID hiện ở đầu.</p>
      </div>

      <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📊</span>
          <h2 className="font-semibold text-white">Google Analytics 4 <span className="text-xs font-normal text-orange-300/80">(Tracking + Remarketing)</span></h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Nhập <b className="text-gray-300">Measurement ID</b> dạng <code className="rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">G-XXXXXXX</code> từ GA4 → hệ thống tự chèn <code className="rounded bg-gray-900 px-1 py-0.5 text-[11px] text-gray-300">gtag.js</code> và bắn event e-commerce
          (view_item, add_to_cart, view_cart, begin_checkout, <b className="text-gray-300">purchase</b>) — bằng đúng các điểm chạm như Meta Pixel.
        </p>
        <input
          value={ga4}
          onChange={e => setGa4(e.target.value)}
          placeholder="VD: G-XXXXXXXXXX — hoặc dán cả đoạn gtag.js"
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
        />
        <p className="mt-1.5 text-[11px] text-gray-600">Lấy tại: analytics.google.com → Quản trị → Luồng dữ liệu (Data Streams) → chọn luồng web → Measurement ID.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : <><ShieldCheck className="h-4 w-4" /> Lưu mã xác minh</>}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" /> Đã lưu — meta tag đã gắn vào toàn trang
          </span>
        )}
      </div>
    </div>
  )
}
