'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get('email') ?? ''
  const callbackUrl = searchParams.get('callbackUrl') ?? '/login'

  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleVerify() {
    if (!email || code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Mã không đúng hoặc đã hết hạn.'); return }
      setSuccess(true)
      setTimeout(() => router.push(`/login?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}&verified=1`), 1500)
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email || resending || countdown > 0) return
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Không thể gửi lại.'); return }
      setCountdown(60)
    } catch {
      setError('Có lỗi xảy ra.')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-lg font-bold text-green-700">Email đã được xác thực!</p>
        <p className="mt-2 text-sm text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
        <p className="text-sm font-semibold text-amber-700">📧 Kiểm tra hộp thư của bạn</p>
        <p className="text-xs text-amber-600 mt-1">
          Mã xác thực 6 chữ số đã được gửi đến<br/>
          <strong>{email || 'email của bạn'}</strong>
        </p>
      </div>

      {!emailFromQuery && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-red"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác thực (6 chữ số)</label>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder="_ _ _ _ _ _"
          className="w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.5em] outline-none focus:border-brand-red"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full cursor-pointer rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading ? 'Đang xác thực...' : 'Xác Thực Email'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Không nhận được mã?{' '}
        <button
          onClick={handleResend}
          disabled={resending || countdown > 0}
          className="font-medium text-brand-red hover:underline disabled:opacity-50 cursor-pointer"
        >
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : resending ? 'Đang gửi...' : 'Gửi lại mã'}
        </button>
      </p>
    </div>
  )
}
