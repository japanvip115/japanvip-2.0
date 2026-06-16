'use client'

import { useState } from 'react'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !email || !password) { setError('Vui lòng điền đầy đủ thông tin bắt buộc'); return }
    if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự'); return }
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email: email.trim().toLowerCase(), phone, password }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Đăng ký thất bại'); setLoading(false); return }

      // Redirect to verify-email — OTP has been sent
      window.location.href = '/verify-email?email=' + encodeURIComponent(email.trim().toLowerCase())
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Họ và tên <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
          autoFocus
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten@email.com"
          autoComplete="email"
          required
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Số điện thoại</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0988 969 896"
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Mật khẩu <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ít nhất 8 ký tự"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Xác nhận mật khẩu <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
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
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Bằng cách đăng ký, bạn đồng ý với{' '}
        <a href="/terms" className="text-brand-red hover:underline">Điều khoản sử dụng</a>
        {' '}và{' '}
        <a href="/privacy" className="text-brand-red hover:underline">Chính sách bảo mật</a>.
      </p>
    </form>
  )
}
