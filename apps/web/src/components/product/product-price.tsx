'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { formatVND } from '@japanvip/utils'
import { PreOrderLeadCapture } from '@/components/product/pre-order-lead-capture'

type Props = {
  slug: string
  isPreOrder: boolean
  japanPriceJpy: number | null
  japanPriceVnd: number | null
  salePrice: number | null
  marketPrice: number | null
  originPrice: number | null
  liveAuction: { currentPrice: number; bidCount: number } | null
}

// Khối giá — client-side (useSession) để trang SP render TĨNH.
// Pre-order: chưa login thấy giá ¥ Nhật + CTA, login thấy giá VN + lead capture.
export function ProductPrice({ slug, isPreOrder, japanPriceJpy, japanPriceVnd, salePrice, marketPrice, originPrice, liveAuction }: Props) {
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user
  const showGate = isPreOrder && !isLoggedIn && !!japanPriceJpy

  return (
    <>
      {isPreOrder && isLoggedIn && <PreOrderLeadCapture />}
      <div className="py-3 border-y border-gray-100">
        {liveAuction ? (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Giá đấu giá hiện tại</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-brand-red">{formatVND(liveAuction.currentPrice)}</span>
              <span className="flex items-center gap-1 rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{liveAuction.bidCount} lượt đặt giá</p>
          </div>
        ) : showGate ? (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Giá tham khảo tại Nhật</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-700">¥{japanPriceJpy!.toLocaleString('ja-JP')}</span>
              {japanPriceVnd && <span className="text-base text-gray-400">(~{formatVND(japanPriceVnd)})</span>}
            </div>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent('/' + slug)}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
            >
              🔓 Đăng nhập để xem giá tại Việt Nam
            </Link>
            <p className="mt-2 text-xs text-gray-400">Giá tại VN đã gồm thuế nhập khẩu, vận chuyển &amp; bảo hành chính hãng.</p>
          </div>
        ) : salePrice ? (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand-red">{formatVND(salePrice)}</span>
              {marketPrice && marketPrice > salePrice && (
                <>
                  <span className="text-base text-gray-400 line-through">{formatVND(marketPrice)}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                    -{Math.round((1 - salePrice / marketPrice) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        ) : originPrice ? (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
            <span className="text-3xl font-bold text-brand-red">{formatVND(originPrice)}</span>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Giá bán</p>
            <span className="text-sm font-bold text-brand-red">Liên hệ để biết giá</span>
          </div>
        )}
      </div>
    </>
  )
}
