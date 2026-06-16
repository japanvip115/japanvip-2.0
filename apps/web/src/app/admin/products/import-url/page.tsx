'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link2, Download, CheckCircle, AlertCircle, Loader2, ArrowLeft, ExternalLink } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

type Result = {
  productId: string
  slug: string
  name: string
  imagesCount: number
}

const SUPPORTED_SITES = [
  {
    name: 'congnghenhat.com',
    favicon: 'https://congnghenhat.com/favicon.ico',
    example: 'https://congnghenhat.com/tu-lanh-hitachi-r-wxc74x-x',
    url: 'https://congnghenhat.com',
  },
  {
    name: 'dienmayxanh.com',
    favicon: 'https://www.dienmayxanh.com/favicon.ico',
    example: 'https://www.dienmayxanh.com/tu-lanh/tu-lanh-hitachi',
    url: 'https://www.dienmayxanh.com',
  },
  {
    name: 'mediamart.vn',
    favicon: 'https://mediamart.vn/favicon.ico',
    example: 'https://mediamart.vn/san-pham/tu-lanh',
    url: 'https://mediamart.vn',
  },
]

export default function ImportUrlPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<Result | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const detectedSite = SUPPORTED_SITES.find((s) => url.includes(s.name))

  async function handleImport() {
    if (!url.trim()) return
    setStatus('loading')
    setResult(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/v1/admin/products/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        setResult(data)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Có lỗi xảy ra khi nhập sản phẩm.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Không kết nối được server. Vui lòng thử lại.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nhập sản phẩm từ URL</h1>
        <p className="mt-1 text-sm text-gray-400">
          Tự động lấy tên, mô tả, thông số kỹ thuật và ảnh sản phẩm từ trang web khác
        </p>
      </div>

      {/* Supported sites */}
      <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="mb-3 text-sm font-semibold text-blue-400">✅ Hỗ trợ các trang web:</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_SITES.map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100"
            >
              <img
                src={site.favicon}
                className="h-4 w-4 object-contain"
                alt=""
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
              {site.name}
            </a>
          ))}
          <span className="inline-flex items-center rounded-lg border border-dashed border-gray-700 px-3 py-1.5 text-sm text-gray-500">
            + các trang WooCommerce khác
          </span>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Link2 className="h-4 w-4 text-blue-400" />
            URL sản phẩm
            {detectedSite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                <img
                  src={detectedSite.favicon}
                  className="h-3 w-3"
                  alt=""
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
                {detectedSite.name} đã nhận diện
              </span>
            )}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus('idle') }}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            placeholder="Dán URL sản phẩm vào đây..."
            disabled={status === 'loading'}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Ví dụ: {detectedSite?.example ?? SUPPORTED_SITES[0]?.example ?? ''}
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={!url.trim() || status === 'loading'}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải dữ liệu & ảnh...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Nhập sản phẩm
            </>
          )}
        </button>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-300">Đang xử lý...</p>
              <p className="mt-0.5 text-sm text-yellow-400/80">
                Đang tải thông tin và download ảnh về server, có thể mất 15–60 giây tùy số lượng ảnh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            <div>
              <p className="font-semibold text-green-300">Nhập thành công!</p>
              <p className="mt-1 text-sm text-green-400/80">
                Đã tạo sản phẩm{' '}
                <span className="font-bold text-green-300">&quot;{result.name}&quot;</span>{' '}
                với <span className="font-bold">{result.imagesCount} ảnh</span> dưới dạng bản nháp (DRAFT).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/admin/products/${result.productId}`)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              ✏️ Chỉnh sửa & Đăng sản phẩm
            </button>
            <button
              onClick={() => window.open(`/${result!.slug}`, '_blank')}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Xem trước
            </button>
            <button
              onClick={() => { setUrl(''); setStatus('idle'); setResult(null) }}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
              Nhập sản phẩm khác
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Có lỗi xảy ra</p>
              <p className="mt-1 text-sm text-red-400/80">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800/40 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-300">📋 Hướng dẫn sử dụng:</p>
        <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
          <li>Vào trang sản phẩm muốn nhập (congnghenhat.com hoặc trang khác)</li>
          <li>Copy đường link URL trên thanh địa chỉ trình duyệt</li>
          <li>Dán vào ô trên và nhấn <strong className="text-gray-200">&quot;Nhập sản phẩm&quot;</strong></li>
          <li>Hệ thống tự tải tên, mô tả, thông số kỹ thuật và download ảnh về server</li>
          <li>Sản phẩm được tạo dưới dạng <strong className="text-gray-200">bản nháp (DRAFT)</strong> — kiểm tra rồi mới Đăng</li>
        </ol>
        <div className="border-t border-gray-700 pt-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500">Ví dụ URL hợp lệ:</p>
          {SUPPORTED_SITES.map((site) => (
            <p key={site.name} className="break-all font-mono text-xs text-gray-500">{site.example}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
