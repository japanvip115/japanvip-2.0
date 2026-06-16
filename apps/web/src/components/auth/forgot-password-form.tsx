'use client'

import { useState, useRef, useEffect } from 'react'

type Step = 'email' | 'otp' | 'success'

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Có lỗi xảy ra.'); return }
      setStep('otp')
      setCountdown(60)
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resending || countdown > 0) return
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Vui lòng nhập đủ 6 chữ số'); return }
    if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự'); return }
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Có lỗi xảy ra.'); return }
      setStep('success')
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="py-6 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <p className="text-lg font-bold text-green-700">Đặt lại mật khẩu thành công!</p>
        <p className="text-sm text-gray-500">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <a
          href={`/login?email=${encodeURIComponent(email)}`}
          className="inline-block w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white text-center hover:bg-brand-red-dark"
        >
          Đăng nhập ngay
        </a>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleResetPassword} className="space-y-5">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm font-semibold text-amber-700">📧 Kiểm tra hộp thư</p>
          <p className="text-xs text-amber-600 mt-1">
            Mã 6 chữ số đã gửi đến <strong>{email}</strong>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác thực (6 chữ số)</label>
          <input
            ref={otpRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
            placeholder="_ _ _ _ _ _"
            className="w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.5em] outline-none focus:border-brand-red"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">❌ {error}</div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6 || !password || !confirmPassword}
          className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {loading ? 'Đang đặt lại...' : 'Đặt Lại Mật Khẩu'}
        </button>

        <p className="text-center text-xs text-gray-500">
          Không nhận được mã?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="font-medium text-brand-red hover:underline disabled:opacity-50"
          >
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : resending ? 'Đang gửi...' : 'Gửi lại mã'}
          </button>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-5">
      <p className="text-sm text-gray-500">
        Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">❌ {error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading ? 'Đang gửi...' : 'Gửi Mã Xác Thực'}
      </button>
    </form>
  )
}
