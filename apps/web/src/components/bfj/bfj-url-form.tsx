'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatVND } from '@japanvip/utils'
import type { ParsedProduct } from '@/modules/bfj/url-parser/types'
import type { CostEstimate } from '@/modules/bfj/services/cost-calculator.service'

type Step = 'input' | 'loading' | 'preview' | 'error'
type ParseResult = ParsedProduct & { estimate?: CostEstimate }

type StaticFees = {
  serviceFeeRate: number
  domesticShippingJpy: number
  surchargeRate: number
  depositRate: number
  shippingLabel: string
}

const PLATFORM_LABELS: Record<string, string> = {
  AMAZON_JP: 'Amazon JP',
  RAKUTEN: 'Rakuten',
  MERCARI: 'Mercari',
  YAHOO_SHOPPING: 'Yahoo Shopping JP',
  OTHER: 'Khác',
}

export function BfjUrlForm({ fees }: { fees: StaticFees }) {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState(() => searchParams.get('url') ?? '')

  useEffect(() => {
    const u = searchParams.get('url')
    if (u) setUrl(u)
  }, [searchParams])
  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState<Step>('input')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeImg, setActiveImg] = useState(0)

  // Description / specs expand toggles
  const [descExpanded, setDescExpanded] = useState(false)
  const [specsExpanded, setSpecsExpanded] = useState(false)

  // Inline order flow states
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [isOrdering, setIsOrdering] = useState(false)
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; orderId: string } | null>(null)

  // Quote request states (no-price path)
  const [quoteNotes, setQuoteNotes] = useState('')
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteSuccess, setQuoteSuccess] = useState(false)

  async function handleParse() {
    if (!url.trim()) return
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    setUrl(normalizedUrl)
    setStep('loading')
    setErrorMsg('')
    setActiveImg(0)
    setShowOrderForm(false)
    setOrderResult(null)

    try {
      const parseRes = await fetch('/api/v1/bfj/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })
      const parseData = await parseRes.json()
      if (!parseData.success) throw new Error(parseData.error)

      const product: ParsedProduct = parseData.data

      let estimate: CostEstimate | undefined
      if (product.unitPriceJpy) {
        const estRes = await fetch('/api/v1/bfj/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitPriceJpy: product.unitPriceJpy,
            quantity,
            ...(product.weightKg != null ? { estimatedWeightKg: product.weightKg } : {}),
          }),
        })
        const estData = await estRes.json()
        if (estData.success) estimate = estData.data
      }

      setResult({ ...product, estimate })
      setStep('preview')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra')
      setStep('error')
    }
  }

  async function handleRecalculate(qty: number) {
    if (!result?.unitPriceJpy) return
    const estRes = await fetch('/api/v1/bfj/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitPriceJpy: result.unitPriceJpy,
        quantity: qty,
        ...(result.weightKg != null ? { estimatedWeightKg: result.weightKg } : {}),
      }),
    })
    const estData = await estRes.json()
    if (estData.success) setResult((prev) => prev ? { ...prev, estimate: estData.data } : prev)
  }

  function changeQty(delta: number) {
    const next = Math.max(1, Math.min(50, quantity + delta))
    setQuantity(next)
    handleRecalculate(next)
  }

  async function handleOrderClick() {
    const sessionRes = await fetch('/api/auth/session')
    const session = await sessionRes.json()
    if (!session?.user) {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent('/mua-ho')
      return
    }
    setShowOrderForm(true)
    setAgreedTerms(false)
    setOrderNotes('')
  }

  async function handleConfirmOrder() {
    if (!result || !agreedTerms) return
    setIsOrdering(true)
    try {
      const res = await fetch('/api/v1/bfj/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: orderNotes || undefined,
          items: [{
            sourceUrl: result.sourceUrl,
            productName: result.productNameVi ?? result.productName ?? undefined,
            productImage: result.images?.[0] ?? result.productImage ?? undefined,
            unitPriceJpy: result.unitPriceJpy ?? undefined,
            quantity,
          }],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setOrderResult({ orderNumber: data.data.orderNumber, orderId: data.data.id })
      setShowOrderForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đặt đơn')
    } finally {
      setIsOrdering(false)
    }
  }

  async function handleQuoteClick() {
    const sessionRes = await fetch('/api/auth/session')
    const session = await sessionRes.json()
    if (!session?.user) {
      window.location.href = '/register?callbackUrl=' + encodeURIComponent('/mua-ho') + '&reason=quote'
      return
    }
    setShowQuoteForm(true)
    setQuoteNotes('')
  }

  async function handleConfirmQuote() {
    if (!result || isQuoting) return
    setIsQuoting(true)
    try {
      const res = await fetch('/api/v1/bfj/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: result.sourceUrl,
          productName: result.productNameVi ?? result.productName ?? '',
          productImage: result.images?.[0] ?? null,
          productModel: result.productModel ?? null,
          notes: quoteNotes || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setQuoteSuccess(true)
      setShowQuoteForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsQuoting(false)
    }
  }

  // Count bullet points in HTML description to decide if we need "Xem thêm"
  const descBulletCount = (result?.description?.match(/<li/g) ?? []).length
  const needsDescToggle = descBulletCount > 6
  const specs = result?.specifications ?? []
  const SPECS_PREVIEW = 8

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Left column ── */}
      <div className="space-y-5 lg:col-span-2">
        {/* URL Input */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-bold text-gray-900">🔗 Nhập URL Sản Phẩm</h2>
          <p className="mb-4 text-sm text-gray-500">Dán đường dẫn sản phẩm từ các sàn Nhật Bản bên dưới.</p>

          <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
            <span className="text-gray-400">🔗</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              placeholder="https://www.amazon.co.jp/dp/..."
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            {url && (
              <button
                onClick={() => { setUrl(''); setStep('input'); setResult(null); setOrderResult(null) }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >✕</button>
            )}
          </div>

          <button
            onClick={handleParse}
            disabled={step === 'loading' || !url.trim()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
          >
            {step === 'loading' ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Đang lấy thông tin...</>
            ) : (
              <><span>🔍</span> Kiểm Tra Ngay</>
            )}
          </button>

          {step !== 'preview' && (
            <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              <span className="font-medium">💡 Hỗ trợ:</span>
              <ul className="mt-1 space-y-0.5">
                {['amazon.co.jp/dp/...', 'item.rakuten.co.jp/...', 'jp.mercari.com/item/...'].map((s) => (
                  <li key={s} className="flex items-center gap-1.5"><span className="text-amber-400">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {step === 'error' && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              ❌ {errorMsg || 'Không thể lấy thông tin sản phẩm. Vui lòng thử lại.'}
            </div>
          )}
        </div>

        {/* Product detail */}
        {step === 'preview' && result && (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            {/* Image gallery */}
            {result.images && result.images.length > 0 && (
              <div className="relative aspect-[4/3] w-full bg-gray-50">
                <Image
                  src={result.images[activeImg] ?? result.images[0]!}
                  alt="Ảnh sản phẩm"
                  fill
                  className="object-contain p-6"
                  unoptimized
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white tracking-wide">
                  {PLATFORM_LABELS[result.platform] ?? result.platform}
                </span>
              </div>
            )}

            {/* Thumbnails */}
            {result.images && result.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t bg-gray-50 p-3">
                {result.images.slice(0, 10).map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition ${i === activeImg ? 'border-brand-red' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <Image src={img} alt={`${i + 1}`} fill className="object-contain p-1" unoptimized />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Title + availability */}
              <div>
                {!result.available && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                    ⚠ Có thể hết hàng
                  </span>
                )}
                {/* Vietnamese name (primary) */}
                <h3 className="text-xl font-bold text-gray-900 leading-snug">
                  {result.productNameVi ?? result.productName ?? 'Không lấy được tên sản phẩm'}
                </h3>
                {/* Model code */}
                {result.productModel && (
                  <p className="mt-1 font-mono text-xs text-gray-400">Mã: {result.productModel}</p>
                )}
                {/* English original name (collapsible reference) */}
                {result.productNameVi && result.productName && result.productNameVi !== result.productName && (
                  <p className="mt-1 text-xs text-gray-400 line-clamp-1" title={result.productName}>
                    {result.productName}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {result.unitPriceJpy && (
                    <p className="text-3xl font-extrabold text-brand-red tabular-nums">
                      ¥{result.unitPriceJpy.toLocaleString('ja-JP')}
                    </p>
                  )}
                  {result.weightKg != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                      ⚖ {result.weightKg} kg
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {result.description && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Tính năng & Mô tả</p>
                  <div
                    className={`text-sm text-gray-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 transition-all ${needsDescToggle && !descExpanded ? 'line-clamp-[12] overflow-hidden' : ''}`}
                    dangerouslySetInnerHTML={{ __html: result.description }}
                  />
                  {needsDescToggle && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="mt-2 text-xs font-medium text-brand-red hover:underline cursor-pointer"
                    >
                      {descExpanded ? '▲ Thu gọn' : '▼ Xem thêm'}
                    </button>
                  )}
                </div>
              )}

              {/* Specs table */}
              {specs.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Thông số kỹ thuật</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {(specsExpanded ? specs : specs.slice(0, SPECS_PREVIEW)).map((spec, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="py-2.5 px-4 font-medium text-gray-500 w-2/5 align-top">{spec.label}</td>
                            <td className="py-2.5 px-4 text-gray-900">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {specs.length > SPECS_PREVIEW && (
                    <button
                      onClick={() => setSpecsExpanded(!specsExpanded)}
                      className="mt-2 text-xs font-medium text-brand-red hover:underline cursor-pointer"
                    >
                      {specsExpanded ? `▲ Thu gọn` : `▼ Xem thêm ${specs.length - SPECS_PREVIEW} thông số`}
                    </button>
                  )}
                </div>
              )}

              {/* Original link */}
              <a
                href={result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                Xem sản phẩm gốc trên {PLATFORM_LABELS[result.platform] ?? 'trang gốc'} →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Right column ── */}
      <div className="space-y-4">
        {step === 'preview' && result && !result.estimate ? (
          <>
            {/* No-price panel — product found but price not extracted */}
            <div className="sticky top-4 space-y-3">
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                {result.images && result.images.length > 0 && (
                  <div className="flex items-start gap-3 border-b p-4">
                    <div className="relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border bg-gray-50">
                      <Image src={result.images[0]!} alt="" fill className="object-contain p-1" unoptimized />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                        {result.productNameVi ?? result.productName ?? '—'}
                      </p>
                      {result.productModel && (
                        <p className="font-mono text-[10px] text-gray-400 mt-0.5">{result.productModel}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                    <p className="text-sm font-semibold text-amber-700 mb-1">⚠ Không lấy được giá tự động</p>
                    <p className="text-xs text-amber-600">
                      Đăng nhập để gửi yêu cầu báo giá — tư vấn viên sẽ phản hồi qua email và Zalo.
                    </p>
                  </div>

                  {quoteSuccess ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center space-y-2">
                      <p className="text-green-700 font-bold text-sm">✅ Yêu cầu đã được gửi!</p>
                      <p className="text-xs text-green-600">Tư vấn viên sẽ liên hệ bạn sớm nhất. Kiểm tra email để xem xác nhận.</p>
                      <a
                        href="https://zalo.me/0988969896"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg bg-brand-red py-2 text-xs font-bold text-white text-center"
                      >
                        Chat ngay qua Zalo
                      </a>
                    </div>
                  ) : (
                    <>
                      {showQuoteForm ? (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-gray-800">Yêu Cầu Báo Giá</p>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú (tùy chọn)</label>
                            <textarea
                              value={quoteNotes}
                              onChange={(e) => setQuoteNotes(e.target.value)}
                              rows={3}
                              placeholder="Màu sắc, kích cỡ, yêu cầu đặc biệt..."
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-red resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleConfirmQuote}
                              disabled={isQuoting}
                              className="flex-1 cursor-pointer rounded-lg bg-brand-red py-2.5 text-sm font-bold text-white transition hover:bg-brand-red-dark disabled:opacity-50"
                            >
                              {isQuoting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                            </button>
                            <button
                              onClick={() => setShowQuoteForm(false)}
                              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleQuoteClick}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition hover:bg-brand-red-dark cursor-pointer"
                          >
                            💬 Yêu Cầu Báo Giá
                          </button>
                          <p className="text-center text-[11px] text-gray-400">
                            Cần đăng nhập • Nhận xác nhận qua email
                          </p>
                          <a
                            href="tel:0988969896"
                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            📞 Gọi 0988.969.896
                          </a>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Fee table below no-price panel */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h4 className="mb-4 font-bold text-gray-900">💰 Bảng Phí Dịch Vụ</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Phí mua hộ</span>
                    <span className="font-bold text-brand-red">{(fees.serviceFeeRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Phụ phí thanh toán</span>
                    <span className="font-bold text-brand-red">{(fees.surchargeRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Vận chuyển nội địa JP</span>
                    <span className="font-bold text-gray-800">¥{fees.domesticShippingJpy.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ship JP → VN</span>
                    <span className="font-bold text-gray-800">{fees.shippingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-gray-600">Đặt cọc</span>
                    <span className="font-bold text-brand-red">{(fees.depositRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : step === 'preview' && result?.estimate ? (
          <>
            {/* Sticky cost panel */}
            <div className="sticky top-4 space-y-3">
              {/* Mini product header */}
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                {result.images && result.images.length > 0 && (
                  <div className="flex items-start gap-3 border-b p-4">
                    <div className="relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border bg-gray-50">
                      <Image src={result.images[0]!} alt="" fill className="object-contain p-1" unoptimized />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                        {result.productNameVi ?? result.productName ?? '—'}
                      </p>
                      {result.productModel && (
                        <p className="font-mono text-[10px] text-gray-400 mt-0.5">{result.productModel}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Cost breakdown */}
                <div className="p-4 space-y-2 text-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Chi phí ước tính</p>

                  <div className="flex justify-between text-gray-500">
                    <span>Giá sản phẩm</span>
                    <span className="font-medium text-gray-800">¥{result.unitPriceJpy?.toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tỷ giá ({result.estimate.exchangeRate.toLocaleString('vi-VN')} ₫/¥)</span>
                    <span className="font-medium text-gray-800">{formatVND(result.estimate.productPriceVnd / quantity)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Phí mua hộ ({(result.estimate.serviceFeeRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium text-gray-800">+{formatVND(result.estimate.serviceFeeVnd / quantity)}</span>
                  </div>
                  {result.estimate.domesticShippingJpy > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Phí nội địa Nhật</span>
                      <span className="font-medium text-gray-800">+{formatVND(result.estimate.domesticShippingVnd)}</span>
                    </div>
                  )}
                  {result.estimate.surchargeRate > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Phụ thu ({(result.estimate.surchargeRate * 100).toFixed(0)}%)</span>
                      <span className="font-medium text-gray-800">+{formatVND(result.estimate.surchargeVnd / quantity)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>
                      Ship JP → VN
                      {result.weightKg != null && (
                        <span className="ml-1 text-[10px] text-blue-500">({result.weightKg} kg)</span>
                      )}
                    </span>
                    <span className="font-medium text-gray-800">+{formatVND(result.estimate.shippingEstimateVnd)}</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold text-gray-900">Tổng ước tính</span>
                    <span className="text-lg font-extrabold text-brand-red tabular-nums">{formatVND(result.estimate.totalEstimateVnd)}</span>
                  </div>
                </div>

                {/* Deposit highlight */}
                <div className="mx-4 mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
                    Đặt cọc ({(result.estimate.depositRate * 100).toFixed(0)}%)
                  </p>
                  <p className="text-2xl font-extrabold text-red-600 tabular-nums">
                    {formatVND(result.estimate.depositAmountVnd)}
                  </p>
                  <p className="mt-1 text-[11px] text-red-400">Thanh toán phần còn lại khi nhận hàng</p>
                </div>

                {/* Quantity + CTA */}
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-600">Số lượng</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(-1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100">−</button>
                      <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                      <button onClick={() => changeQty(1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100">+</button>
                    </div>
                  </div>

                  {orderResult ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center space-y-2">
                      <p className="text-green-700 font-bold text-sm">✅ Đặt cọc thành công!</p>
                      <p className="text-xs text-green-600">Đơn hàng <span className="font-mono font-bold">{orderResult.orderNumber}</span> đã được tạo.</p>
                      <div className="flex flex-col gap-1.5">
                        <Link
                          href={`/dashboard/orders/${orderResult.orderId}`}
                          className="block rounded-lg bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 text-center"
                        >
                          Xem đơn hàng →
                        </Link>
                        <button
                          onClick={() => { setStep('input'); setUrl(''); setResult(null); setOrderResult(null) }}
                          className="block w-full rounded-lg border border-gray-300 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer text-center"
                        >
                          Tiếp tục mua hàng
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleOrderClick}
                        className="w-full cursor-pointer rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition hover:bg-brand-red-dark"
                      >
                        Đặt Cọc & Mua Ngay
                      </button>
                      <a
                        href="https://zalo.me/0988969896"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        💬 Báo Giá Zalo
                      </a>
                    </>
                  )}
                </div>

                {/* Inline order form */}
                {showOrderForm && !orderResult && (
                  <div className="border-t mx-0 p-4 bg-gray-50 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Xác Nhận Đặt Cọc</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú (tùy chọn)</label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        rows={3}
                        placeholder="Màu sắc, kích cỡ, yêu cầu đặc biệt..."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-red resize-none"
                      />
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 cursor-pointer accent-brand-red"
                      />
                      <span className="text-xs text-gray-600">
                        Tôi đồng ý với{' '}
                        <a href="/chinh-sach" target="_blank" className="text-brand-red underline">điều khoản dịch vụ</a>
                        {' '}và xác nhận đặt cọc{' '}
                        <strong>{formatVND(result.estimate.depositAmountVnd)}</strong>
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmOrder}
                        disabled={!agreedTerms || isOrdering}
                        className="flex-1 cursor-pointer rounded-lg bg-brand-red py-2.5 text-sm font-bold text-white transition hover:bg-brand-red-dark disabled:opacity-50"
                      >
                        {isOrdering ? 'Đang xử lý...' : `Xác Nhận — ${formatVND(result.estimate.depositAmountVnd)}`}
                      </button>
                      <button
                        onClick={() => setShowOrderForm(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Support box */}
              <div className="rounded-2xl border bg-gray-900 p-4 text-white">
                <h4 className="mb-1 text-sm font-semibold">💬 Cần Hỗ Trợ?</h4>
                <p className="mb-3 text-xs text-gray-400">Tư vấn viên hỗ trợ từ 8:00 – 18:30 mỗi ngày</p>
                <a
                  href="tel:0988969896"
                  className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-brand-red py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
                >
                  📞 0988.969.896
                </a>
                <a
                  href="https://zalo.me/0988969896"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Chat Zalo
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Fee table — always visible */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h4 className="mb-4 font-bold text-gray-900">💰 Bảng Phí Dịch Vụ</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phí mua hộ</span>
                    <span className="font-semibold text-gray-900">{(fees.serviceFeeRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phí kho Nhật</span>
                    <span className="font-semibold text-gray-900">
                      {fees.domesticShippingJpy > 0 ? `¥${fees.domesticShippingJpy.toLocaleString('ja-JP')}` : '0đ'}
                    </span>
                  </div>
                  {fees.surchargeRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Phụ thu</span>
                      <span className="font-semibold text-gray-900">{(fees.surchargeRate * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ship JP → VN</span>
                    <span className="font-semibold text-gray-900">{fees.shippingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-brand-red">
                    <span className="font-semibold">Đặt cọc tối thiểu</span>
                    <span className="font-bold">{(fees.depositRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

            <div className="rounded-2xl border bg-gray-900 p-5 text-white">
              <h4 className="mb-1 text-sm font-semibold">💬 Cần Hỗ Trợ?</h4>
              <p className="mb-3 text-xs text-gray-400">Liên hệ tư vấn viên để được hỗ trợ báo giá nhanh nhất</p>
              <a
                href="tel:0988969896"
                className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-brand-red py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
              >
                📞 0988.969.896
              </a>
              <a
                href="https://zalo.me/0988969896"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-300 hover:bg-gray-800"
              >
                Chat Zalo
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
