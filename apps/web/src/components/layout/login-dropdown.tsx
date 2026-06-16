'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'

export function LoginDropdown() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })
    if (result?.error) {
      if (result.error.includes('EMAIL_NOT_VERIFIED')) {
        window.location.href = '/verify-email?email=' + encodeURIComponent(email.trim().toLowerCase())
        return
      }
      setError('Email hoặc mật khẩu không đúng.')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden md:block text-sm font-medium hover:text-brand-red transition-colors"
      >
        Đăng nhập
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 rounded-2xl border bg-white p-5 shadow-xl z-50">
          {/* Arrow */}
          <div className="absolute -top-2 right-4 h-4 w-4 rotate-45 border-l border-t bg-white" />

          <p className="mb-4 text-sm font-semibold text-gray-800">Đăng nhập tài khoản</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@email.com"
                autoFocus
                required
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Mật khẩu</label>
                <a href="/forgot-password" className="text-xs text-brand-red hover:underline">Quên mật khẩu?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-red py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60 transition-colors"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-gray-400">
            Chưa có tài khoản?{' '}
            <a href="/register" className="font-medium text-brand-red hover:underline">Đăng ký ngay</a>
          </p>
        </div>
      )}
    </div>
  )
}
