'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      window.location.href = callbackUrl
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
    </form>
  )
}
