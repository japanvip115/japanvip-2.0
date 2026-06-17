'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function OAuthSettingsPage() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState({ id: false, secret: false, idMask: '', secretMask: '' })
  const [loadingInit, setLoadingInit] = useState(true)

  useEffect(() => {
    fetch('/api/v1/admin/settings/oauth')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setConfigured({
            id: res.data.clientIdConfigured,
            secret: res.data.clientSecretConfigured,
            idMask: res.data.clientIdMasked,
            secretMask: res.data.clientSecretMasked,
          })
        }
      })
      .finally(() => setLoadingInit(false))
  }, [])

  async function handleSave() {
    if (!clientId && !clientSecret) {
      setError('Vui lòng nhập ít nhất một giá trị cần cập nhật')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/v1/admin/settings/oauth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId || undefined, clientSecret: clientSecret || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setClientId('')
        setClientSecret('')
        // Refresh masked values
        const refresh = await fetch('/api/v1/admin/settings/oauth').then((r) => r.json())
        if (refresh.success) {
          setConfigured({
            id: refresh.data.clientIdConfigured,
            secret: refresh.data.clientSecretConfigured,
            idMask: refresh.data.clientIdMasked,
            secretMask: refresh.data.clientSecretMasked,
          })
        }
      } else {
        setStatus('error')
        setError(data.error ?? 'Lỗi lưu cài đặt')
      }
    } catch {
      setStatus('error')
      setError('Không kết nối được server')
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      <div>
        <Link
          href="/admin/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Cài Đặt
        </Link>
        <h1 className="text-2xl font-bold text-white">Google OAuth</h1>
        <p className="mt-1 text-sm text-gray-400">
          Cài đặt Client ID và Client Secret để cho phép đăng nhập bằng Google
        </p>
      </div>

      {/* Hướng dẫn */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3 text-sm text-blue-300">
        <p className="font-semibold text-blue-200">📋 Cách lấy thông tin từ Google Cloud Console:</p>
        <ol className="list-decimal list-inside space-y-1.5 text-blue-300/80">
          <li>Vào <strong className="text-blue-200">console.cloud.google.com</strong> → APIs &amp; Services → Credentials</li>
          <li>Chọn OAuth 2.0 Client ID của dự án Japan VIP</li>
          <li>Copy <strong className="text-blue-200">Client ID</strong> và tạo/copy <strong className="text-blue-200">Client Secret</strong> mới</li>
          <li>Dán vào các ô bên dưới và nhấn Lưu</li>
        </ol>
        <p className="text-xs text-blue-400/70 border-t border-blue-500/20 pt-2">
          ⚠️ Sau khi lưu, cần <strong>restart server</strong> để thay đổi có hiệu lực (Vercel tự động khi deploy).
        </p>
      </div>

      {/* Trạng thái hiện tại */}
      {!loadingInit && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Trạng thái hiện tại</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Client ID</span>
              {configured.id ? (
                <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {configured.idMask}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Chưa cài đặt
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Client Secret</span>
              {configured.secret ? (
                <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {configured.secretMask}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Chưa cài đặt
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-5">
        <p className="text-sm font-semibold text-gray-200">Cập Nhật Credentials</p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={configured.id ? 'Để trống nếu không đổi' : 'Nhập Google Client ID...'}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
          <p className="text-xs text-gray-600">Dạng: 1234567890-xxxx.apps.googleusercontent.com</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Client Secret</label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={configured.secret ? 'Để trống nếu không đổi' : 'Nhập Google Client Secret...'}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 pr-10 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-600">Dạng: GOCSPX-xxxxxxxxxxxxxxxxxxxx</p>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-700/50 px-3 py-2 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Đã lưu thành công! Restart server để áp dụng.
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 border border-red-700/50 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'loading'}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {status === 'loading' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {status === 'loading' ? 'Đang lưu...' : 'Lưu Credentials'}
        </button>
      </div>

      {/* Authorized redirect URIs */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-3 text-sm">
        <p className="font-semibold text-yellow-200">🔗 Authorized Redirect URIs (cấu hình trong Google Console)</p>
        <p className="text-xs text-yellow-300/70">Thêm đúng các URL này vào Google OAuth App của bạn:</p>
        <div className="space-y-1 font-mono text-xs">
          <div className="rounded bg-gray-900 px-3 py-1.5 text-yellow-300">http://localhost:3000/api/auth/callback/google</div>
          <div className="rounded bg-gray-900 px-3 py-1.5 text-yellow-300">https://japanvip.vn/api/auth/callback/google</div>
          <div className="rounded bg-gray-900 px-3 py-1.5 text-yellow-300">https://store.japanvip.vn/api/auth/callback/google</div>
        </div>
      </div>
    </div>
  )
}
