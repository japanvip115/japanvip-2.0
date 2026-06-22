'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatVND } from '@japanvip/utils'
import type { ParsedProduct } from '@/modules/bfj/url-parser/types'
import type { CostEstimate } from '@/modules/bfj/services/cost-calculator.service'
import { AddressPicker, type Address } from '@/components/address/address-picker'

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
    if (u && u.trim()) {
      setUrl(u)
      // Auto-trigger parse when URL comes from homepage redirect
      const normalized = u.trim().startsWith('http') ? u.trim() : `https://${u.trim()}`
      setStep('loading')
      setErrorMsg('')
      setActiveImg(0)
      setShowOrderForm(false)
      setOrderResult(null)
      fetch('/api/v1/bfj/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
        .then((r) => r.json())
        .then(async (parseData) => {
          if (!parseData.success) throw new Error(parseData.error)
          const product = parseData.data
          let estimate
          if (product.unitPriceJpy) {
            const estRes = await fetch('/api/v1/bfj/estimate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                unitPriceJpy: product.unitPriceJpy,
                quantity: 1,
                ...(product.weightKg != null ? { estimatedWeightKg: product.weightKg } : {}),
              }),
            })
            const estData = await estRes.json()
            if (estData.success) estimate = estData.data
          }
          setResult({ ...product, estimate })
          setStep('preview')
        })
        .catch((err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra')
          setStep('error')
        })
    }
  }, [])
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
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; orderId: string; depositAmount?: number } | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofSubmitted, setProofSubmitted] = useState(false)
  const [proofError, setProofError] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = loading

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setIsLoggedIn(!!s?.user))
      .catch(() => setIsLoggedIn(false))
  }, [])

  // Manual price input (no-price path)
  const [manualPriceJpy, setManualPriceJpy] = useState('')
  const [isCalculatingManual, setIsCalculatingManual] = useState(false)

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
          addressId: selectedAddress?.id ?? undefined,
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
      setOrderResult({ orderNumber: data.data.orderNumber, orderId: data.data.id, depositAmount: result?.estimate?.depositAmountVnd })
      setShowOrderForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đặt đơn')
    } finally {
      setIsOrdering(false)
    }
  }

  async function handleManualCalculate() {
    const price = parseInt(manualPriceJpy.replace(/[^0-9]/g, ''), 10)
    if (!price || price <= 0 || !result) return
    setIsCalculatingManual(true)
    try {
      const estRes = await fetch('/api/v1/bfj/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitPriceJpy: price,
          quantity,
          ...(result.weightKg != null ? { estimatedWeightKg: result.weightKg } : {}),
        }),
      })
      const estData = await estRes.json()
      if (estData.success) {
        setResult((prev) => prev ? { ...prev, unitPriceJpy: price, estimate: estData.data } : prev)
      }
    } finally {
      setIsCalculatingManual(false)
    }
  }

  async function handleUploadProof() {
    if (!proofFile || !orderResult) return
    setProofUploading(true)
    setProofError('')
    try {
      const fd = new FormData()
      fd.append('file', proofFile)
      const upRes = await fetch('/api/v1/bfj/upload-proof', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upData.success) throw new Error(upData.error)

      const proofRes = await fetch(`/api/v1/bfj/orders/${orderResult.orderId}/deposit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositProofUrl: upData.data.url }),
      })
      const proofData = await proofRes.json()
      if (!proofData.success) throw new Error(proofData.error)
      setProofSubmitted(true)
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'Lỗi upload')
    } finally {
      setProofUploading(false)
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
            {url ? (
              <button
                onClick={() => { setUrl(''); setStep('input'); setResult(null); setOrderResult(null) }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >✕</button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    if (text.trim()) setUrl(text.trim())
                  } catch {}
                }}
                className="flex items-center gap-1 rounded-lg bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300 cursor-pointer transition-colors whitespace-nowrap"
              >
                📋 Dán
              </button>
            )}
          </div>

          <button
            onClick={handleParse}
            disabled={step === 'loading' || !url.trim()}
            className="mt-3 mx-auto flex w-96 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60"
            style={{background:'transparent', color:'#c41e3a', border:'2px solid #fecaca'}}
            onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background='#c41e3a'; e.currentTarget.style.color='white'; e.currentTarget.style.border='2px solid #c41e3a' }}}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#c41e3a'; e.currentTarget.style.border='2px solid #fecaca' }}
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
              {result.description && (() => {
                const hasJapanese = /[ぁ-んァ-ヶ一-鿿]/.test(result.description)
                return hasJapanese ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <p className="font-medium mb-1">📋 Mô tả sản phẩm bằng tiếng Nhật</p>
                    <p className="text-xs text-amber-600">
                      Xem đầy đủ tính năng và mô tả trên trang gốc —{' '}
                      <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        Xem sản phẩm gốc trên {result.platform === 'AMAZON_JP' ? 'Amazon JP' : result.platform} →
                      </a>
                    </p>
                  </div>
                ) : (
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
                )
              })()}

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
                  {/* Manual price input */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-amber-700">⚠ Không lấy được giá tự động</p>
                      <p className="text-xs text-amber-600 mt-0.5">Sản phẩm này ẩn giá — bạn có thể nhập thủ công</p>
                    </div>
                    {((result.colorVariants && result.colorVariants.length > 0) || (result.priceOptionsJpy && result.priceOptionsJpy.length > 1)) && (
                      <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-100/60 p-3">
                        <p className="text-xs font-bold text-amber-800">⚠ Sản phẩm nhiều màu/cấu hình — giá khác nhau</p>
                        {result.colorVariants && result.colorVariants.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {result.colorVariants.map((cv) => (
                              <div key={cv.name + cv.image} className="flex w-16 flex-col items-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={cv.image} alt={cv.name} className="h-12 w-12 rounded-lg border border-amber-200 bg-white object-contain" />
                                <span className="mt-0.5 line-clamp-2 text-center text-[10px] leading-tight text-amber-800">{cv.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {result.priceOptionsJpy && result.priceOptionsJpy.length > 1 && (
                          <p className="text-xs text-amber-700">Giá tham khảo: <b>¥{Math.min(...result.priceOptionsJpy).toLocaleString('ja-JP')} – ¥{Math.max(...result.priceOptionsJpy).toLocaleString('ja-JP')}</b> (tuỳ màu/cấu hình)</p>
                        )}
                        <p className="text-[11px] leading-relaxed text-amber-800">👉 Để đặt <b>ĐÚNG sản phẩm</b>: mở <a href={result?.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">trang Amazon</a> → chọn đúng màu/cấu hình → copy link → dán lại. JapanVIP sẽ mua đúng link bạn dán.</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1.5">Nhập giá từ Amazon JP (¥)</label>
                      <div className="flex gap-2">
                        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 focus-within:border-amber-500">
                          <span className="text-sm font-bold text-amber-600">¥</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={manualPriceJpy ? parseInt(manualPriceJpy.replace(/\./g, ''), 10).toLocaleString('de-DE') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
                              setManualPriceJpy(raw)
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualCalculate()}
                            placeholder="vd: 15.800"
                            className="flex-1 bg-transparent text-sm text-gray-800 outline-none tabular-nums placeholder:text-gray-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleManualCalculate}
                          disabled={isCalculatingManual || !manualPriceJpy}
                          className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isCalculatingManual ? '...' : 'Tính phí'}
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-amber-600">
                        Mở <a href={result?.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">trang sản phẩm</a> → xem giá → nhập vào đây
                      </p>
                    </div>
                  </div>

                  {quoteSuccess ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center space-y-2">
                      <p className="text-green-700 font-bold text-sm">✅ Yêu cầu đã được gửi!</p>
                      <p className="text-xs text-green-600">Tư vấn viên sẽ liên hệ bạn sớm nhất. Kiểm tra email để xem xác nhận.</p>
                      <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-brand-red py-2 text-xs font-bold text-white text-center">
                        Chat ngay qua Zalo
                      </a>
                    </div>
                  ) : !isLoggedIn ? (
                    /* LOGIN GATE for no-price path */
                    <div className="rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-4 text-center space-y-3">
                      <p className="text-sm font-bold text-gray-900">🔓 Hoặc đăng nhập để nhận báo giá</p>
                      <p className="text-xs text-gray-500">Tư vấn viên phản hồi qua email trong 1–4 giờ làm việc</p>
                      <button
                        type="button"
                        onClick={() => signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/mua-ho' })}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Đăng nhập với Google
                      </button>
                      <p className="text-[10px] text-gray-400">
                        Hoặc <a href={`/register?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/mua-ho')}`} className="underline text-brand-red">tạo tài khoản miễn phí</a>
                      </p>
                      <a href="tel:0988969896" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        📞 Gọi 0988.969.896
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
                            <button onClick={handleConfirmQuote} disabled={isQuoting} className="flex-1 cursor-pointer rounded-lg bg-brand-red py-2.5 text-sm font-bold text-white transition hover:bg-brand-red-dark disabled:opacity-50">
                              {isQuoting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                            </button>
                            <button onClick={() => setShowQuoteForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={handleQuoteClick} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition hover:bg-brand-red-dark cursor-pointer">
                            💬 Yêu Cầu Báo Giá
                          </button>
                          <p className="text-center text-[11px] text-gray-400">Nhận xác nhận qua email</p>
                          <a href="tel:0988969896" className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
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
                    <span className="text-gray-600">Phí dịch vụ Japan VIP</span>
                    <span className="font-bold text-brand-red">{(fees.serviceFeeRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Phí kiểm tra & đóng gói</span>
                    <span className="font-bold text-brand-red">{(fees.surchargeRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ship nội địa Nhật</span>
                    <span className="font-bold text-gray-800">¥{fees.domesticShippingJpy.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ship quốc tế JP → VN</span>
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

                {/* LOGIN GATE — show when not logged in */}
                {!isLoggedIn ? (
                  <div className="p-5 space-y-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Chi phí ước tính về VN</p>

                    {/* Blurred price teaser */}
                    <div className="relative space-y-2 text-sm select-none">
                      {[
                        { label: 'Giá sản phẩm (JPY)', w: 'w-20' },
                        { label: 'Phí mua hộ (8%)', w: 'w-16' },
                        { label: 'Ship JP → VN', w: 'w-24' },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between text-gray-400">
                          <span>{row.label}</span>
                          <span className={`${row.w} h-4 rounded bg-gray-200 blur-[3px]`} />
                        </div>
                      ))}
                      <div className="border-t pt-3 flex justify-between">
                        <span className="font-bold text-gray-700">Tổng về VN</span>
                        <span className="w-28 h-6 rounded-lg bg-red-100 blur-[4px]" />
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-4 text-center space-y-3">
                      <p className="text-sm font-bold text-gray-900">🔓 Đăng nhập để xem giá</p>
                      <p className="text-xs text-gray-500">Xem đầy đủ chi phí về Việt Nam, đặt cọc và theo dõi đơn hàng</p>
                      <button
                        type="button"
                        onClick={() => signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/mua-ho' })}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Đăng nhập với Google
                      </button>
                      <p className="text-[10px] text-gray-400">Hoặc <a href={`/register?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/mua-ho')}`} className="underline text-brand-red">tạo tài khoản miễn phí</a></p>
                    </div>
                  </div>
                ) : (
                <>
                {/* Cost breakdown */}
                <div className="p-4 space-y-2 text-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Chi phí ước tính</p>

                  <div className="flex justify-between text-gray-500">
                    <span>Giá sản phẩm</span>
                    <span className="font-semibold text-gray-900">¥{result.unitPriceJpy?.toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tỷ giá ({result.estimate.exchangeRate.toLocaleString('vi-VN')} ₫/¥)</span>
                    <span className="font-semibold text-gray-900">{formatVND(result.estimate.productPriceVnd / quantity)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Phí dịch vụ Japan VIP ({(result.estimate.serviceFeeRate * 100).toFixed(0)}%)</span>
                    <span className="font-semibold text-gray-900">+{formatVND(result.estimate.serviceFeeVnd / quantity)}</span>
                  </div>
                  {result.estimate.domesticShippingJpy > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Ship nội địa Nhật</span>
                      <span className="font-semibold text-gray-900">+{formatVND(result.estimate.domesticShippingVnd)}</span>
                    </div>
                  )}
                  {result.estimate.surchargeRate > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Phí kiểm tra & đóng gói ({(result.estimate.surchargeRate * 100).toFixed(0)}%)</span>
                      <span className="font-semibold text-gray-900">+{formatVND(result.estimate.surchargeVnd / quantity)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>
                      Ship quốc tế JP → VN
                      {result.weightKg != null && (
                        <span className="ml-1 text-[10px] text-blue-500">({result.weightKg} kg)</span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-900">+{formatVND(result.estimate.shippingEstimateVnd)}</span>
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
                    <div className="space-y-3">
                      {/* Order created banner */}
                      <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                        <p className="text-green-700 font-bold text-sm">✅ Đơn hàng đã được tạo!</p>
                        <p className="text-xs text-green-600 mt-0.5">Mã đơn: <span className="font-mono font-bold">{orderResult.orderNumber}</span></p>
                      </div>

                      {/* Bank transfer info + VietQR */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Chuyển khoản đặt cọc</p>
                        <div className="flex justify-center">
                          <img
                            src={`https://img.vietqr.io/image/TPB-25040930477-compact2.png?amount=${orderResult.depositAmount ?? ''}&addInfo=${encodeURIComponent(orderResult.orderNumber)}&accountName=${encodeURIComponent('HKD DIEN LANH DIEN GIA DUNG TO NGOC ANH')}`}
                            alt="QR chuyen khoan"
                            className="w-48 h-48 rounded-lg border border-blue-200"
                          />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-600">Ngan hang</span>
                            <span className="font-semibold text-blue-900">TPBank</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-blue-600">So tai khoan</span>
                            <span className="font-mono font-bold text-blue-900 select-all">25040930477</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Chu tai khoan</span>
                            <span className="font-semibold text-blue-900 text-right max-w-[60%]">HKD DIEN LANH DIEN GIA DUNG - TO NGOC ANH</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-blue-600">Noi dung CK</span>
                            <span className="font-mono font-bold text-blue-900 select-all">{orderResult.orderNumber}</span>
                          </div>
                          {orderResult.depositAmount && (
                            <div className="flex justify-between border-t border-blue-200 pt-2 mt-1">
                              <span className="font-bold text-blue-700">So tien coc</span>
                              <span className="font-extrabold text-blue-900">{formatVND(orderResult.depositAmount)}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-blue-500 text-center">Quet QR bang app ngan hang de chuyen khoan nhanh</p>
                      </div>

                      {/* Upload proof */}
                      {proofSubmitted ? (
                        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center space-y-1">
                          <p className="text-green-700 font-bold text-sm">✅ Đã gửi biên lai!</p>
                          <p className="text-xs text-green-600">Nhân viên sẽ xác nhận và xử lý đơn hàng sớm nhất.</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                          <p className="text-xs font-bold text-gray-700">📎 Upload biên lai chuyển khoản</p>
                          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 cursor-pointer hover:border-brand-red transition-colors">
                            <span className="text-2xl">{proofFile ? '🖼' : '📤'}</span>
                            <span className="text-xs text-gray-500">
                              {proofFile ? proofFile.name : 'Chọn ảnh biên lai (JPG, PNG)'}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => { setProofFile(e.target.files?.[0] ?? null); setProofError('') }}
                            />
                          </label>
                          {proofError && <p className="text-xs text-red-500">{proofError}</p>}
                          <button
                            type="button"
                            onClick={handleUploadProof}
                            disabled={!proofFile || proofUploading}
                            className="w-full cursor-pointer rounded-lg bg-brand-red py-2.5 text-xs font-bold text-white transition hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {proofUploading ? 'Đang gửi...' : 'Gửi biên lai'}
                          </button>
                          <p className="text-[10px] text-gray-400 text-center">Hoặc gửi qua Zalo 0988.969.896</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <Link
                          href={`/dashboard/orders/${orderResult.orderId}`}
                          className="block rounded-lg border border-gray-300 py-2 text-xs text-gray-600 hover:bg-gray-50 text-center"
                        >
                          Xem chi tiết đơn hàng →
                        </Link>
                        <button
                          onClick={() => { setStep('input'); setUrl(''); setResult(null); setOrderResult(null); setProofFile(null); setProofSubmitted(false) }}
                          className="block w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer text-center"
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

                </>
                )} {/* end isLoggedIn cost panel */}

                {/* Inline order form */}
                {isLoggedIn && showOrderForm && !orderResult && (
                  <div className="border-t mx-0 p-4 bg-gray-50 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Xác Nhận Đặt Cọc</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Địa chỉ nhận hàng</label>
                      <AddressPicker
                        selectedId={selectedAddress?.id}
                        onSelect={setSelectedAddress}
                      />
                    </div>
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
                  className="mb-2 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
                  style={{border:'2px solid rgba(255,255,255,0.5)', color:'white', background:'transparent'}}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor='white' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.5)' }}
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
                    <span className="text-gray-500">Phí dịch vụ Japan VIP</span>
                    <span className="font-semibold text-gray-400">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ship nội địa Nhật</span>
                    <span className="font-semibold text-gray-400">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phí kiểm tra & đóng gói</span>
                    <span className="font-semibold text-gray-400">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ship quốc tế JP → VN</span>
                    <span className="font-semibold text-gray-400">—</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-gray-400">
                    <span className="font-semibold">Đặt cọc tối thiểu</span>
                    <span className="font-bold">—</span>
                  </div>
                  <p className="pt-1 text-center text-xs text-gray-400">Nhập URL sản phẩm để xem chi phí</p>
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
