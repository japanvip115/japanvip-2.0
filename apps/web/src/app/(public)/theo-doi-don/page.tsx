'use client'

import { useState } from 'react'
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Đã xác nhận', icon: CheckCircle },
  { key: 'purchased', label: 'Đã mua hàng', icon: Package },
  { key: 'shipping_jp', label: 'Đang ship Nhật', icon: Truck },
  { key: 'customs', label: 'Thông quan', icon: Clock },
  { key: 'shipping_vn', label: 'Đang giao VN', icon: Truck },
  { key: 'delivered', label: 'Đã giao hàng', icon: CheckCircle },
]

export default function TheoDoidonPage() {
  const [code, setCode] = useState('')
  const [searched, setSearched] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) setSearched(true)
  }

  return (
    <div className="min-h-[60vh] bg-gray-50">
      {/* Hero */}
      <div className="bg-gray-900 py-12 text-center text-white">
        <h1 className="text-3xl font-bold">Theo Dõi Đơn Hàng</h1>
        <p className="mt-2 text-gray-400">Nhập mã đơn hàng để kiểm tra trạng thái</p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã đơn hàng (VD: JVP-2024-001)..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/30"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-red px-5 py-3 text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors"
          >
            <Search className="h-4 w-4" />
            Tra Cứu
          </button>
        </form>

        {/* Result */}
        {searched && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">Mã đơn hàng</p>
                <p className="text-lg font-bold text-gray-900">{code.toUpperCase()}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                <AlertCircle className="h-3.5 w-3.5" />
                Không tìm thấy
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại hoặc liên hệ{' '}
              <a href="tel:0988969896" className="font-semibold text-brand-red">0988.969.896</a> để được hỗ trợ.
            </p>
          </div>
        )}

        {/* Guide */}
        {!searched && (
          <div className="mt-10">
            <p className="mb-4 text-center text-sm font-medium text-gray-500">Quy trình xử lý đơn hàng</p>
            <div className="relative flex justify-between">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
              {STATUS_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.key} className="relative flex flex-col items-center gap-2 text-center" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] leading-tight text-gray-500">{step.label}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900">Cần hỗ trợ?</p>
              <p className="mt-1 text-sm text-gray-500">Liên hệ đội ngũ chúng tôi để tra cứu đơn hàng nhanh nhất.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="tel:0988969896" className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors">
                  📞 0988.969.896
                </a>
                <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50 transition-colors">
                  💬 Zalo hỗ trợ
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
