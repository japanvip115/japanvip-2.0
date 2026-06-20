'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatVND } from '@japanvip/utils'
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@/lib/auction-status'
import { getDeviceFingerprint } from '@/lib/device-fingerprint'
import type { AuctionStatus } from '@japanvip/db'
import type { AuctionEvent } from '@japanvip/types'

type Bid = {
  id: string
  amount: number
  bidderId: string
  bidderName: string
  createdAt: string
  isAutoBid?: boolean
}

type Props = {
  auctionId: string
  auctionNumber: string
  initialStatus: AuctionStatus
  initialCurrentPrice: number
  initialBidCount: number
  initialEndsAt: string
  initialExtendedEnd: string | null
  startPrice: number
  minIncrement: number
  buyNowPrice: number | null
  initialBids: Bid[]
  winnerId: string | null
  userId: string | null
  isLoggedIn: boolean
  auctionFeeRate: number
  shippingFee: number
}

function CostBreakdown({ price, feeRate, shippingFee }: { price: number; feeRate: number; shippingFee: number }) {
  const auctionFee = Math.round(price * feeRate / 100)
  const total = price + auctionFee + shippingFee

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span>🧾</span> Chi phí ước tính về tay
        </span>
        <span className="text-sm font-black text-brand-red">{formatVND(total)}</span>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Giá đấu hiện tại</span>
            <span className="font-semibold text-gray-800">{formatVND(price)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              Phí dịch vụ đấu giá
              <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-400">{feeRate}%</span>
            </span>
            <span className="font-semibold text-gray-800">+{formatVND(auctionFee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              Phí vận chuyển
              <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-400">ước tính</span>
            </span>
            <span className="font-semibold text-gray-800">+{formatVND(shippingFee)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5">
            <span className="text-sm font-bold text-gray-700">Tổng về đến tay</span>
            <span className="text-base font-black text-brand-red">{formatVND(total)}</span>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            * Phí vận chuyển thực tế có thể thay đổi theo khu vực giao hàng
          </p>
        </div>
    </div>
  )
}

function maskName(name: string): string {
  if (!name) return '***'
  const parts = name.trim().split(/\s+/)
  return parts.map((p) => (p.length <= 1 ? p : p[0] + '*'.repeat(p.length - 1))).join(' ')
}

function useCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()))
  useEffect(() => {
    const iv = setInterval(() => setTimeLeft(Math.max(0, new Date(endsAt).getTime() - Date.now())), 1000)
    return () => clearInterval(iv)
  }, [endsAt])
  return timeLeft
}

function FlipCard({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  const display = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-xl text-3xl font-black transition-colors duration-500 ${
          urgent ? 'bg-red-600 text-white shadow-lg shadow-red-500/40' : 'bg-white/10 text-white'
        }`}
      >
        {display}
      </div>
      <p className={`mt-1.5 text-[10px] font-bold tracking-widest ${urgent ? 'text-red-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}

export function AuctionDetailClient({
  auctionId, auctionNumber, initialStatus, initialCurrentPrice,
  initialBidCount, initialEndsAt, initialExtendedEnd,
  startPrice, minIncrement, buyNowPrice, initialBids,
  winnerId: initialWinnerId, userId, isLoggedIn,
  auctionFeeRate, shippingFee,
}: Props) {
  const [status, setStatus] = useState<AuctionStatus>(initialStatus)
  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [endsAt, setEndsAt] = useState(initialExtendedEnd ?? initialEndsAt)
  const [bids, setBids] = useState<Bid[]>(initialBids)
  const [winnerId, setWinnerId] = useState<string | null>(initialWinnerId)
  const [bidAmount, setBidAmount] = useState(initialCurrentPrice + minIncrement)
  const [bidding, setBidding] = useState(false)
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')
  const [bidMode, setBidMode] = useState<'manual' | 'max'>('manual')
  const [maxBidAmount, setMaxBidAmount] = useState(initialCurrentPrice + minIncrement * 3)
  const [maxBidding, setMaxBidding] = useState(false)
  const [myMaxBid, setMyMaxBid] = useState<number | null>(null)
  const [deviceFp, setDeviceFp] = useState('')
  const [sseConnected, setSseConnected] = useState(false)
  const [pricePulse, setPricePulse] = useState(false)
  const [extendedPulse, setExtendedPulse] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [follows, setFollows] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const bidInputRef = useRef<HTMLInputElement>(null)

  const timeLeft = useCountdown(endsAt)
  const expired = timeLeft <= 0
  const isLive = status === 'LIVE'

  // Init random viewers/follows after hydration to avoid SSR mismatch
  useEffect(() => {
    setViewers(Math.floor(Math.random() * 30) + 20)
    setFollows(Math.floor(Math.random() * 60) + 40)
  }, [])

  // Fluctuate viewer count to simulate live activity
  useEffect(() => {
    if (!isLive) return
    const iv = setInterval(() => {
      setViewers((v) => Math.max(5, v + Math.floor(Math.random() * 5) - 2))
    }, 7000)
    return () => clearInterval(iv)
  }, [isLive])
  const canBid = isLive && !expired
  const suggestedBid = currentPrice + minIncrement
  const urgent = timeLeft > 0 && timeLeft <= 5 * 60 * 1000 // < 5 minutes

  const totalHours = Math.floor(timeLeft / 3600000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((timeLeft % 3600000) / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)
  const showDays = days > 0

  useEffect(() => {
    if (status !== 'LIVE') return
    const es = new EventSource(`/api/v1/auctions/events/${auctionId}`)
    esRef.current = es
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null
    es.onopen = () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null }
      setSseConnected(true)
    }
    es.onerror = () => {
      disconnectTimer = setTimeout(() => setSseConnected(false), 3000)
    }
    es.onmessage = (e) => {
      try { handleAuctionEvent(JSON.parse(e.data) as AuctionEvent) } catch {}
    }
    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      es.close()
      setSseConnected(false)
    }
  }, [auctionId, status])

  const handleAuctionEvent = useCallback((event: AuctionEvent) => {
    switch (event.type) {
      case 'bid_placed':
        setCurrentPrice(event.data.newCurrentPrice)
        setBidCount(event.data.bidCount)
        setBidAmount(event.data.newCurrentPrice + minIncrement)
        if (event.data.newEndTime) setEndsAt(event.data.newEndTime)
        setPricePulse(true)
        setTimeout(() => setPricePulse(false), 800)
        setBids((prev) => [{
          id: Date.now().toString(),
          amount: event.data.amount,
          bidderId: event.data.bidderId ?? '',
          bidderName: event.data.bidderId && event.data.bidderId === userId ? 'Bạn' : 'Ẩn danh',
          createdAt: new Date().toISOString(),
        }, ...prev.slice(0, 19)])
        break
      case 'auction_extended':
        setEndsAt(event.data.newEndTime)
        setExtendedPulse(true)
        setTimeout(() => setExtendedPulse(false), 4000)
        break
      case 'auction_ended':
        setStatus('ENDED')
        setWinnerId(event.data.winnerId)
        break
    }
  }, [userId, minIncrement])

  function mapBidError(code: string, serverMessage?: string): string {
    // Ưu tiên message từ server nếu có (thường có thông tin chi tiết hơn)
    if (serverMessage && serverMessage !== code) return serverMessage
    const map: Record<string, string> = {
      CROSS_AUCTION_LIMIT: 'Tổng nghĩa vụ các phiên đang tham gia vượt quá 10× tiền cọc. Vui lòng nạp thêm cọc hoặc chờ kết thúc phiên khác.',
      DEPOSIT_REQUIRED: 'Bạn cần nạp tiền đặt cọc để tham gia đấu giá.',
      INSUFFICIENT_DEPOSIT: 'Số dư đặt cọc không đủ cho mức giá này.',
      AUCTION_NOT_LIVE: 'Phiên đấu giá chưa bắt đầu hoặc đã kết thúc.',
      BID_TOO_LOW: 'Giá đặt phải cao hơn giá hiện tại.',
      SELLER_CANNOT_BID: 'Người bán không thể tham gia đấu giá của mình.',
      ACCOUNT_SUSPENDED: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.',
      RATE_LIMITED: 'Bạn đang đặt giá quá nhanh. Vui lòng chờ vài giây.',
      DUPLICATE_REQUEST: 'Yêu cầu trùng lặp, giá đặt đã được ghi nhận.',
    }
    return map[code] ?? code
  }

  async function handleBid() {
    if (!isLoggedIn) {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname)
      return
    }
    if (bidAmount < suggestedBid) { setBidError(`Giá đặt tối thiểu là ${formatVND(suggestedBid)}`); return }
    setBidding(true); setBidError(''); setBidSuccess('')
    try {
      const res = await fetch(`/api/v1/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ amount: bidAmount, deviceFingerprint: deviceFp || undefined }),
      })
      const data = await res.json()
      if (data.error === 'EMAIL_NOT_VERIFIED') {
        window.location.href = '/verify-email?email=' + encodeURIComponent(data.email ?? '') + '&callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }
      if (data.error === 'DEPOSIT_REQUIRED') {
        window.location.href = '/dashboard/deposit?callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }
      if (data.success) {
        const newPrice = data.data?.auction?.currentPrice ?? bidAmount
        const newBidCount = data.data?.auction?.bidCount ?? (bidCount + 1)
        setCurrentPrice(newPrice)
        setBidCount(newBidCount)
        setBidAmount(newPrice + minIncrement)
        setBidSuccess(`Đặt giá ${formatVND(bidAmount)} thành công!`)
        setTimeout(() => setBidSuccess(''), 4000)
      } else {
        setBidError(mapBidError(data.error ?? '', data.message))
      }
    } catch {
      setBidError('Không thể kết nối. Vui lòng thử lại.')
    } finally { setBidding(false) }
  }

  // Scroll to top on mount (fix Next.js scroll restoration issue)
  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

  // Collect device fingerprint on mount
  useEffect(() => {
    getDeviceFingerprint().then(setDeviceFp).catch(() => {})
  }, [])

  // Fetch existing max bid on mount
  useEffect(() => {
    if (!isLoggedIn) return
    fetch(`/api/v1/auctions/${auctionId}/max-bid`)
      .then((r) => r.json())
      .then((d) => { if (d.data?.maxAmount) setMyMaxBid(Number(d.data.maxAmount)) })
      .catch(() => {})
  }, [auctionId, isLoggedIn])

  async function handleMaxBid() {
    if (!isLoggedIn) {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname)
      return
    }
    if (maxBidAmount < suggestedBid) { setBidError(`Max Bid phải ít nhất ${formatVND(suggestedBid)}`); return }
    setMaxBidding(true); setBidError(''); setBidSuccess('')
    try {
      const res = await fetch(`/api/v1/auctions/${auctionId}/max-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ maxAmount: maxBidAmount, deviceFingerprint: deviceFp || undefined }),
      })
      const data = await res.json()
      if (data.error === 'EMAIL_NOT_VERIFIED') {
        window.location.href = '/verify-email?email=' + encodeURIComponent(data.email ?? '') + '&callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }
      if (data.error === 'DEPOSIT_REQUIRED') {
        window.location.href = '/dashboard/deposit?callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }
      if (data.success) {
        setMyMaxBid(maxBidAmount)
        setBidSuccess(`Max Bid ${formatVND(maxBidAmount)} đã được đặt!`)
        setTimeout(() => setBidSuccess(''), 5000)
      } else {
        setBidError(mapBidError(data.error ?? '', data.message ?? 'Có lỗi xảy ra'))
      }
    } catch {
      setBidError('Không thể kết nối. Vui lòng thử lại.')
    } finally { setMaxBidding(false) }
  }

  const isWinner = winnerId === userId

  return (
    <div className="space-y-4">
      {/* ── Auction number ── */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-400">{auctionNumber}</span>
        {/* Status shown here only when not live (live status is inside countdown bar) */}
        {(isLive && expired) && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">Đã kết thúc</span>
        )}
        {!isLive && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${AUCTION_STATUS_COLORS[status]}`}>
            {AUCTION_STATUS_LABELS[status]}
          </span>
        )}
      </div>

      {/* ── Current Price ── */}
      <div className={`rounded-2xl border p-4 transition-all duration-300 ${pricePulse ? 'border-red-400 bg-red-50 scale-[1.01]' : 'border-red-200 bg-white'}`}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400">Giá đặt hiện tại</p>
            <p className={`text-3xl font-black transition-colors duration-300 ${pricePulse ? 'text-red-500' : 'text-brand-red'}`}>
              {formatVND(currentPrice)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{bidCount} lượt đặt giá</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Bước giá</p>
            <p className="text-base font-bold text-gray-600">+{formatVND(minIncrement)}</p>
          </div>
        </div>
      </div>

      {/* ── Live stats bar ── */}
      {isLive && !expired && (
        <div className="flex items-center justify-around rounded-xl border border-red-200 bg-white py-2.5 text-center">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👁</span>
            <div>
              <p className="text-sm font-black text-gray-800">{viewers}</p>
              <p className="text-[10px] text-gray-400">Đang xem</p>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-100" />
          <div className="flex items-center gap-1.5">
            <span className="text-base">🔨</span>
            <div>
              <p className="text-sm font-black text-brand-red">{bidCount}</p>
              <p className="text-[10px] text-gray-400">Lượt đặt</p>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-100" />
          <div className="flex items-center gap-1.5">
            <span className="text-base">❤️</span>
            <div>
              <p className="text-sm font-black text-gray-800">{follows}</p>
              <p className="text-[10px] text-gray-400">Theo dõi</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Countdown ── */}
      {isLive && !expired && (
        <div className={`rounded-2xl px-5 py-4 transition-colors duration-500 ${urgent ? 'bg-red-950' : 'bg-gray-900'}`}>
          <div className="flex items-start justify-between gap-4">
            {/* Left: trạng thái */}
            <div className="shrink-0 pt-0.5">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${AUCTION_STATUS_COLORS[status]}`}>
                {AUCTION_STATUS_LABELS[status]}
              </span>
            </div>

            {/* Right: clock */}
            <div className="flex flex-col items-center flex-1">
              <p className={`mb-2 text-xs font-medium ${urgent ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                {urgent ? '🔥 Sắp kết thúc!' : '⏳ Phiên kết thúc sau'}
              </p>
          <div className="flex items-center justify-center gap-3">
            {showDays ? (
              <>
                <FlipCard value={days} label="NGÀY" urgent={false} />
                <span className="mb-5 text-2xl font-bold text-gray-500">:</span>
                <FlipCard value={hours} label="GIỜ" urgent={false} />
                <span className="mb-5 text-2xl font-bold text-gray-500">:</span>
                <FlipCard value={minutes} label="PHÚT" urgent={false} />
              </>
            ) : (
              <>
                <FlipCard value={hours} label="GIỜ" urgent={urgent && hours === 0} />
                <span className={`mb-5 text-2xl font-bold ${urgent ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>:</span>
                <FlipCard value={minutes} label="PHÚT" urgent={urgent && hours === 0 && minutes < 2} />
                <span className={`mb-5 text-2xl font-bold ${urgent ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>:</span>
                <FlipCard value={seconds} label="GIÂY" urgent={urgent} />
              </>
            )}
          </div>
          {extendedPulse && (
            <p className="mt-2 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-bold text-yellow-300 animate-pulse">
              ⚡ Phiên được gia hạn thêm thời gian!
            </p>
          )}
            </div>{/* end clock col */}

            {/* Right: trực tiếp */}
            <div className="shrink-0 pt-0.5">
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors duration-1000 ${
                sseConnected
                  ? 'bg-green-500/20 text-green-400 ring-green-500/30'
                  : 'bg-gray-500/20 text-gray-500 ring-gray-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sseConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                Trực tiếp
              </span>
            </div>
          </div>{/* end flex row */}
        </div>
      )}

      {/* ── Expired pending ── */}
      {isLive && expired && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
          <p className="text-2xl">🏁</p>
          <p className="mt-1 text-sm font-semibold text-gray-700">Phiên đấu giá đã kết thúc</p>
          <p className="mt-0.5 text-xs text-gray-400">Giá cuối: {formatVND(currentPrice)}</p>
        </div>
      )}

      {/* ── Winner banner ── */}
      {status !== 'LIVE' && winnerId && (
        <div className={`rounded-2xl p-5 text-center ${isWinner ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          {isWinner ? (
            <>
              <p className="text-3xl">🎉</p>
              <p className="mt-1 text-lg font-black text-green-700">Chúc mừng bạn chiến thắng!</p>
              <p className="mt-0.5 text-sm text-green-600">Giá thắng: <span className="font-bold">{formatVND(currentPrice)}</span></p>
            </>
          ) : (
            <>
              <p className="text-2xl">🏁</p>
              <p className="mt-1 text-sm font-medium text-gray-600">Phiên đấu giá đã kết thúc</p>
              <p className="mt-0.5 text-xs text-gray-400">Giá thắng: {formatVND(currentPrice)}</p>
            </>
          )}
        </div>
      )}

      {/* ── Bid form ── */}
      {canBid && (
        <div className="group rounded-2xl border border-red-200 bg-white overflow-hidden">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 border-b border-red-100">
            <button
              onClick={() => { setBidMode('manual'); setBidError('') }}
              className={`py-3 text-xs font-bold transition-colors cursor-pointer ${bidMode === 'manual' ? 'bg-white text-brand-red border-b-2 border-brand-red' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
            >
              Đặt giá thủ công
            </button>
            <button
              onClick={() => { setBidMode('max'); setBidError('') }}
              className={`py-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${bidMode === 'max' ? 'bg-white text-brand-red border-b-2 border-brand-red' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Max Bid
              {myMaxBid && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-brand-red">Đang bật</span>}
            </button>
          </div>

          <div className="p-4 space-y-3">
            {bidMode === 'manual' ? (
              <>
                {/* Manual bid info */}
                <div className="flex items-center gap-2.5 rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5 min-h-[48px]">
                  <span className="text-base shrink-0">🔨</span>
                  <div className="text-xs text-orange-700 leading-relaxed">
                    <span className="font-bold">Đặt giá trực tiếp</span> — chọn mức giá bạn muốn và xác nhận ngay lập tức.
                  </div>
                </div>

                {/* Quick bid buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[suggestedBid, suggestedBid + minIncrement, suggestedBid + minIncrement * 2].map((q, i) => (
                    <button
                      key={q}
                      onClick={() => { setBidAmount(q); setBidError(''); bidInputRef.current?.focus() }}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        bidAmount === q
                          ? 'border-brand-red bg-brand-red text-white shadow-sm shadow-red-200'
                          : 'border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-brand-red'
                      }`}
                    >
                      <span className="block text-[10px] font-normal opacity-70 mb-0.5">{i === 0 ? 'Tối thiểu' : `+${i} bước`}</span>
                      {formatVND(q)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    ref={bidInputRef}
                    type="text"
                    inputMode="numeric"
                    value={bidAmount.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value.replace(/\D/g, ''), 10)
                      if (!isNaN(raw)) { setBidAmount(raw); setBidError('') }
                    }}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-4 pr-10 text-xl font-black text-brand-red transition-colors focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-300">₫</span>
                </div>

                {bidError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                    <span>⚠️</span> {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
                    <span>✅</span> {bidSuccess}
                  </div>
                )}

                <button
                  onClick={handleBid}
                  disabled={bidding}
                  className="w-full rounded-xl py-4 text-base font-black transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer border-2"
                  style={{border:'2px solid #fecaca', color:'#c41e3a', background:'white'}}
                  onMouseEnter={e => { e.currentTarget.style.background='#c41e3a'; e.currentTarget.style.color='white'; e.currentTarget.style.border='2px solid #c41e3a' }}
                  onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='#c41e3a'; e.currentTarget.style.border='2px solid #fecaca' }}
                >
                  {bidding ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang xử lý...
                    </span>
                  ) : '🔨 Đặt Giá Ngay'}
                </button>
              </>
            ) : (
              <>
                {/* Max Bid explanation */}
                <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 min-h-[48px]">
                  <span className="text-base shrink-0">🤖</span>
                  <div className="text-xs text-blue-700 leading-relaxed">
                    <span className="font-bold">Tự động đặt giá</span> theo từng bước tối thiểu, dừng khi đạt mức tối đa bạn chọn.
                  </div>
                </div>

                {myMaxBid && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-amber-700 font-medium">Max Bid hiện tại:</span>
                    <span className="text-sm font-black text-amber-800">{formatVND(myMaxBid)}</span>
                  </div>
                )}

                {/* Max bid quick options */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    suggestedBid + minIncrement * 2,
                    suggestedBid + minIncrement * 5,
                    suggestedBid + minIncrement * 10,
                  ].map((q, i) => (
                    <button
                      key={q}
                      onClick={() => { setMaxBidAmount(q); setBidError('') }}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        maxBidAmount === q
                          ? 'border-brand-red bg-brand-red text-white'
                          : 'border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-brand-red'
                      }`}
                    >
                      <span className="block text-[10px] font-normal opacity-70 mb-0.5">+{[2, 5, 10][i]} bước</span>
                      {formatVND(q)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxBidAmount.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const raw = parseInt(e.target.value.replace(/\D/g, ''), 10)
                      if (!isNaN(raw)) { setMaxBidAmount(raw); setBidError('') }
                    }}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-4 pr-10 text-xl font-black text-brand-red transition-colors focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-300">₫</span>
                </div>

                {bidError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                    <span>⚠️</span> {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
                    <span>✅</span> {bidSuccess}
                  </div>
                )}

                <button
                  onClick={handleMaxBid}
                  disabled={maxBidding}
                  className="w-full rounded-xl py-4 text-base font-black transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer border-2"
                  style={{border:'2px solid #fecaca', color:'#c41e3a', background:'white'}}
                  onMouseEnter={e => { e.currentTarget.style.background='#c41e3a'; e.currentTarget.style.color='white'; e.currentTarget.style.border='2px solid #c41e3a' }}
                  onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='#c41e3a'; e.currentTarget.style.border='2px solid #fecaca' }}
                >
                  {maxBidding ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang đặt...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Đặt Max Bid {formatVND(maxBidAmount)}
                    </span>
                  )}
                </button>
              </>
            )}

            {!isLoggedIn && (
              <p className="text-center text-sm text-gray-600 font-medium">
                Cần <a href="/login" className="font-bold text-brand-red underline underline-offset-2">Đăng Nhập</a> để đặt giá
              </p>
            )}

            {buyNowPrice && (
              <button className="w-full rounded-xl border-2 border-yellow-400 bg-yellow-50 py-3 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100 cursor-pointer">
                ⚡ Mua ngay: {formatVND(buyNowPrice)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Cost breakdown ── */}
      {isLive && (
        <CostBreakdown price={currentPrice} feeRate={auctionFeeRate} shippingFee={shippingFee} />
      )}

      {/* ── Bid history ── */}
      {bids.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-800">Lịch sử đặt giá</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{bidCount}</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {bids.map((bid, i) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  i === 0 ? 'bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-xs">👑</span>}
                  <span className={`font-semibold ${i === 0 ? 'text-brand-red' : 'text-gray-600'}`}>
                    {bid.bidderId === userId ? '★ Bạn' : maskName(bid.bidderName)}
                  </span>
                  {bid.isAutoBid && (
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500 ring-1 ring-blue-100">auto</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-bold ${i === 0 ? 'text-brand-red' : 'text-gray-700'}`}>
                    {formatVND(bid.amount)}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(bid.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
