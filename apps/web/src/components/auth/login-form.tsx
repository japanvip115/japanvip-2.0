'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Chống open-redirect: chỉ chấp nhận đường dẫn nội bộ tương đối (vd "/dashboard"),
  // chặn "//evil.com" và URL tuyệt đối ra ngoài.
  const safeCallback = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return }

    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (result?.error) {
      // NextAuth wraps the thrown error message
      if (result.error.includes('EMAIL_NOT_VERIFIED')) {
        const emailInError = result.error.split('EMAIL_NOT_VERIFIED:')[1] ?? email.trim().toLowerCase()
        window.location.href = '/verify-email?email=' + encodeURIComponent(emailInError)
        return
      }
      setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
      setLoading(false)
    } else {
      window.location.href = safeCallback
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten@email.com"
          autoComplete="email"
          autoFocus
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
          <a href="/forgot-password" className="text-xs text-brand-red hover:underline">
            Quên mật khẩu?
          </a>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400">hoặc</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: safeCallback })}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Đăng nhập bằng Google
      </button>
    </form>
  )
}
