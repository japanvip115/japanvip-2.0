'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { formatVND } from '@japanvip/utils'
import { X, Phone, User, MapPin, Minus, Plus, CheckCircle, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { trackPurchase } from '@/lib/fbq'

type Props = {
  open: boolean
  onClose: () => void
  product: {
    id: string
    slug: string
    name: string
    image: string | null
    priceVnd: number | null
  }
}

type Step = 'form' | 'otp' | 'success'

export function QuickOrderModal({ open, onClose, product }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [error, setError] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [countdown, setCountdown] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)
  const idempotencyRef = useRef<string>('')

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => nameRef.current?.focus(), 300)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('form'); setError(''); setName(''); setEmail(''); setPhone('')
        setAddress(''); setNotes(''); setQuantity(1); setOtpCode(''); setCountdown(0)
        idempotencyRef.current = ''
      }, 300)
    }
  }, [open])

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 200)
  }, [step])

  async function handleSendOtp() {
    if (!name.trim()) { setError('Vui lòng nhập họ tên'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không hợp lệ'); return }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) { setError('Số điện thoại không hợp lệ'); return }

    setSendingOtp(true)
    setError('')
    try {
      const res = await fetch('/api/v1/orders/quick/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Không thể gửi OTP')
      setStep('otp')
      setCountdown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi OTP. Vui lòng thử lại.')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otpCode.length !== 6) { setError('Vui lòng nhập đủ 6 chữ số OTP'); return }

    setLoading(true)
    setError('')
    if (!idempotencyRef.current) idempotencyRef.current = crypto.randomUUID()
    try {
      const res = await fetch('/api/v1/orders/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyRef.current,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          otpCode,
          phone: phone.trim(),
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          quantity,
          productId: product.id,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Có lỗi xảy ra')
      setOrderRef(data.data.orderRef)
      setStep('success')
      trackPurchase({
        ids: [product.id],
        name: product.name,
        value: product.priceVnd ? product.priceVnd * quantity : null,
        numItems: quantity,
        transactionId: data.data.orderRef,
        items: [{ id: product.id, name: product.name, quantity, price: product.priceVnd ?? undefined }],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi đơn. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const total = product.priceVnd ? product.priceVnd * quantity : null

  return (
    <>
      <div
        ref={overlayRef}
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div
        className={`
          fixed z-50 bg-white flex flex-col transition-all duration-300
          bottom-0 left-0 right-0 rounded-t-2xl max-h-[92dvh]
          sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:w-full sm:max-w-md sm:rounded-2xl sm:shadow-2xl
          ${open ? 'translate-y-0 sm:translate-y-[-50%] opacity-100' : 'translate-y-full sm:translate-y-[-40%] opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {step === 'success' ? 'Đặt hàng thành công' : step === 'otp' ? 'Xác thực email' : 'Đặt hàng nhanh'}
          </h2>
          <button onClick={onClose} className="cursor-pointer rounded-full p-1.5 hover:bg-gray-100 text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1">
          {step === 'success' ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-9 w-9 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">Nhận đơn thành công!</h3>
              <p className="text-sm text-gray-500 mb-1">
                Mã tham chiếu: <strong className="text-gray-800">{orderRef}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Nhân viên Japan VIP sẽ gọi lại số <strong className="text-gray-800">{phone}</strong> trong <strong>30 phút</strong> để xác nhận đơn.
              </p>
              <div className="w-full space-y-2">
                <a
                  href="https://zalo.me/0988969896"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-600 transition"
                >
                  Chat Zalo để xác nhận nhanh hơn
                </a>
                <button
                  onClick={onClose}
                  className="w-full cursor-pointer rounded-xl border py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Tiếp tục mua sắm
                </button>
              </div>
            </div>

          ) : step === 'otp' ? (
            /* ─── OTP Step ─── */
            <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <ShieldCheck className="h-7 w-7 text-brand-red" />
                </div>
                <p className="text-sm text-gray-600">
                  Mã OTP 6 chữ số đã gửi đến<br />
                  <strong className="text-gray-900">{email}</strong>
                </p>
                <p className="text-xs text-gray-400">Kiểm tra cả hộp thư Spam nếu không thấy.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Nhập mã OTP <span className="text-red-500">*</span>
                </label>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="• • • • • •"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-red py-3.5 text-sm font-bold text-white shadow-md shadow-red-200 hover:bg-red-700 active:scale-[.98] disabled:opacity-60 transition-all duration-200"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang xác thực...</> : 'Xác nhận & Đặt hàng'}
              </button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-gray-400">Không nhận được mã?</span>
                {countdown > 0 ? (
                  <span className="text-gray-400">Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="cursor-pointer font-medium text-brand-red hover:underline disabled:opacity-50"
                  >
                    {sendingOtp ? 'Đang gửi...' : 'Gửi lại'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep('form'); setOtpCode(''); setError('') }}
                className="w-full cursor-pointer text-sm text-gray-400 hover:text-gray-600 transition"
              >
                ← Quay lại chỉnh sửa thông tin
              </button>
            </form>

          ) : (
            /* ─── Form Step ─── */
            <div className="px-5 py-4 space-y-4">
              {/* Product recap */}
              <div className="flex gap-3 rounded-xl bg-gray-50 p-3">
                {product.image && (
                  <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border bg-white">
                    <Image src={product.image} alt={product.name} fill className="object-contain p-1" sizes="56px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
                  {product.priceVnd && (
                    <p className="mt-0.5 text-sm font-bold text-brand-red">{formatVND(product.priceVnd)}</p>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">Số lượng</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600 transition">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-base font-bold text-gray-900">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(99, quantity + 1))}
                    className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600 transition">
                    <Plus className="h-4 w-4" />
                  </button>
                  {total && <span className="ml-auto text-sm font-bold text-brand-red">= {formatVND(total)}</span>}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input ref={nameRef} type="text" value={name}
                    onChange={(e) => { setName(e.target.value); setError('') }}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="example@gmail.com"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Mã OTP xác thực sẽ được gửi đến email này</p>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError('') }}
                    placeholder="0988 969 896"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Địa chỉ giao hàng <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Ghi chú <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Yêu cầu đặc biệt về màu sắc, phiên bản..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100 transition"
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="pt-1 pb-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-red py-3.5 text-sm font-bold text-white shadow-md shadow-red-200 hover:bg-red-700 active:scale-[.98] disabled:opacity-60 transition-all duration-200"
                >
                  {sendingOtp ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi OTP...</>
                  ) : (
                    'Tiếp tục — Gửi mã xác thực'
                  )}
                </button>
                <p className="text-center text-xs text-gray-400">
                  🔒 Thông tin của bạn được bảo mật tuyệt đối
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
