import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { ExchangeRateForm } from '@/components/admin/exchange-rate-form'

export const metadata: Metadata = { title: 'Admin — Tỷ Giá Hối Đoái' }
export const dynamic = 'force-dynamic'

export default async function ExchangeRatePage() {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const activeRate = rates.find((r) => r.isActive)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tỷ Giá Hối Đoái</h1>
        <p className="text-sm text-gray-400">Quản lý tỷ giá JPY → VND áp dụng cho đơn hàng Mua Hộ</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current rate */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 font-bold text-gray-200">Tỷ Giá Hiện Tại</h2>
          {activeRate ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-900 p-5 text-center">
                <p className="text-sm text-gray-400">1 JPY =</p>
                <p className="mt-1 text-4xl font-black text-green-400">
                  {Number(activeRate.rate).toLocaleString('vi-VN')} ₫
                </p>
                <p className="mt-1 text-xs text-gray-500">{activeRate.fromCurrency} → {activeRate.toCurrency}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Nguồn:</span>
                  <span className="text-gray-200">{activeRate.source}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Cập nhật lúc:</span>
                  <span className="text-gray-200">{new Date(activeRate.updatedAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-8">Chưa có tỷ giá nào được thiết lập</p>
          )}
        </div>

        {/* Set new rate */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 font-bold text-gray-200">Cập Nhật Tỷ Giá Mới</h2>
          <ExchangeRateForm currentRate={activeRate ? Number(activeRate.rate) : null} />
        </div>
      </div>

      {/* History */}
      <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        <div className="border-b border-gray-700 px-5 py-4">
          <h2 className="font-bold text-gray-200">Lịch Sử Tỷ Giá</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-700 bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Tỷ giá</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Cặp tiền</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">Trạng thái</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Nguồn</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rates.map((rate) => (
              <tr key={rate.id} className="hover:bg-gray-750">
                <td className="px-4 py-3 font-bold text-gray-200">
                  {Number(rate.rate).toLocaleString('vi-VN')} ₫
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {rate.fromCurrency} → {rate.toCurrency}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rate.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {rate.isActive ? 'Đang dùng' : 'Hết hiệu lực'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{rate.source}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(rate.createdAt).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
