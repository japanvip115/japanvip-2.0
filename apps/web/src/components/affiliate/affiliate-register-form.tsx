'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'

export function AffiliateRegisterForm() {
  const { data: session, status } = useSession()
  const [form, setForm] = useState({ fullName: '', phone: '', refCode: '', email: '', otp: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function sendOtp() {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Vui lòng nhập email hợp lệ trước')
      return
    }
    setError('')
    setSendingOtp(true)
    try {
      const res = await fetch('/api/v1/partner/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.fullName || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSent(true)
        setOtpCountdown(60)
        const timer = setInterval(() => {
          setOtpCountdown((c) => {
            if (c <= 1) { clearInterval(timer); return 0 }
            return c - 1
          })
        }, 1000)
      } else {
        setError(data.error ?? 'Không gửi được OTP')
      }
    } catch {
      setError('Không kết nối được. Vui lòng thử lại.')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.fullName) { setError('Vui lòng nhập họ tên'); return }
    if (!form.phone) { setError('Vui lòng nhập số điện thoại'); return }
    if (!form.email || !form.otp) { setError('Vui lòng xác minh email bằng mã OTP'); return }
    if (!form.refCode) { setError('Vui lòng nhập Mã giới thiệu của bạn (ô cuối cùng)'); return }
    if (!/^[A-Z0-9_]{3,20}$/i.test(form.refCode)) {
      setError('Mã giới thiệu chỉ dùng chữ cái, số và _, tối thiểu 3 ký tự')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, refCode: form.refCode.toUpperCase() }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setError('Không kết nối được. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className="py-8 text-center text-sm text-gray-400">Đang tải...</div>
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl space-y-4">
        <p className="text-center font-medium text-gray-300">Đăng nhập để tiếp tục đăng ký</p>

        {/* Google */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/cong-tac-vien' })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Đăng nhập bằng Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-500">hoặc</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          href="/login?callbackUrl=/cong-tac-vien"
          className="flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
        >
          Đăng nhập bằng Email
        </Link>

        <p className="text-center text-xs text-gray-500">
          Chưa có tài khoản?{' '}
          <Link href="/register?callbackUrl=/cong-tac-vien" className="font-medium text-amber-400 hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15 text-2xl text-emerald-300">✓</div>
        <h3 className="text-lg font-bold text-white">Đăng ký thành công!</h3>
        <p className="mt-2 text-sm text-gray-300">
          Đơn đăng ký của bạn đã được gửi. Admin Japan VIP sẽ xét duyệt trong vòng 24h làm việc và thông báo qua email <strong className="text-white">{form.email}</strong>.
        </p>
        <p className="mt-4 text-sm text-gray-400">Mã giới thiệu của bạn: <strong className="font-mono text-lg text-amber-300">{form.refCode.toUpperCase()}</strong></p>
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-amber-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-amber-400/30'
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400'

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl space-y-4">
      <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200/90">
        Đăng ký với tài khoản: <strong className="text-amber-200">{session.user?.email}</strong>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Họ tên đầy đủ *</label>
          <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Nguyễn Văn A" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Số điện thoại *</label>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="09xxxxxxxx" className={inputCls} />
        </div>
      </div>

      {/* Email + OTP */}
      <div className="border-t border-white/10 pt-5">
        <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3">Xác minh email nhận thông báo</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Email *</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="email@example.com"
                className={`${inputCls} flex-1`}
                disabled={otpSent && otpCountdown > 0}
              />
              <button
                type="button"
                onClick={sendOtp}
                disabled={sendingOtp || (otpSent && otpCountdown > 0)}
                className="flex-shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {sendingOtp ? 'Đang gửi...' : otpCountdown > 0 ? `Gửi lại (${otpCountdown}s)` : otpSent ? 'Gửi lại' : 'Gửi OTP'}
              </button>
            </div>
          </div>
          {otpSent && (
            <div>
              <label className={labelCls}>Mã OTP *</label>
              <input
                type="text"
                value={form.otp}
                onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="Nhập mã 6 số từ email"
                maxLength={6}
                className={`${inputCls} font-mono tracking-widest text-center text-lg`}
              />
              <p className="mt-1.5 text-xs text-emerald-400">✓ Mã OTP đã gửi đến <strong>{form.email}</strong>, có hiệu lực 10 phút.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 pt-5">
        <label className={labelCls}>Mã giới thiệu của bạn * <span className="font-normal normal-case text-gray-400">(tự chọn, VD: NGUYEN2024)</span></label>
        <input
          type="text"
          value={form.refCode}
          onChange={(e) => setForm((f) => ({ ...f, refCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
          placeholder="TENMACUABAN"
          maxLength={20}
          className={`${inputCls} font-mono`}
        />
        <p className="mt-1.5 text-xs text-gray-500">Link của bạn sẽ là: <span className="text-amber-300/80">store.japanvip.vn?ref={form.refCode || 'MACUABAN'}</span></p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
        <span className="mt-0.5 text-base">🔒</span>
        <p className="text-xs leading-relaxed text-gray-400">
          Thông tin tài khoản ngân hàng <strong className="text-gray-300">không cần khai báo lúc này</strong>. Sau khi được duyệt, bạn sẽ cập nhật tài khoản nhận hoa hồng ngay trong trang quản lý đối tác — bảo mật tuyệt đối.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !otpSent || form.otp.length < 6}
        className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-sm font-bold text-gray-900 shadow-[0_4px_24px_rgba(251,191,36,0.25)] transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_6px_28px_rgba(251,191,36,0.4)] disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 disabled:shadow-none"
      >
        {submitting ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
      </button>
      {!otpSent && (
        <p className="text-center text-xs text-gray-500">Vui lòng xác minh email trước khi gửi đơn</p>
      )}
    </form>
  )
}
