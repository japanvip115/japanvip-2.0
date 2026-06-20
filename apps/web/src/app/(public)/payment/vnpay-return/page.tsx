import Link from 'next/link'
import { getVnpayConfig } from '@/lib/payments/vnpay-config'
import { verifySignature } from '@/lib/payments/vnpay'

export const metadata = { title: 'Kết quả thanh toán — Japan VIP' }

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function VnpayReturnPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') query[k] = v
  }

  const config = await getVnpayConfig()
  const validSig = config ? verifySignature(config, query) : false
  const success = validSig && query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00'
  const amount = query.vnp_Amount ? Number(query.vnp_Amount) / 100 : 0

  return (
    <div className="container max-w-lg py-16 text-center">
      <div className="text-6xl mb-5">{success ? '✅' : '❌'}</div>
      <h1 className={`text-2xl font-bold mb-3 ${success ? 'text-green-700' : 'text-red-600'}`}>
        {success ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
      </h1>

      {!validSig && (
        <p className="text-sm text-amber-600 mb-2">⚠ Không xác thực được chữ ký giao dịch. Vui lòng liên hệ Japan VIP nếu đã bị trừ tiền.</p>
      )}

      {success ? (
        <p className="text-gray-600 mb-2">
          Japan VIP đã nhận <strong className="text-gray-900">{amount.toLocaleString('vi-VN')}₫</strong>.
          Trạng thái đơn sẽ được cập nhật ngay.
        </p>
      ) : (
        <p className="text-gray-600 mb-2">Giao dịch chưa hoàn tất. Bạn có thể thử lại từ trang đơn hàng.</p>
      )}

      {query.vnp_TxnRef && (
        <p className="text-xs text-gray-400 mb-8">Mã giao dịch: <strong>{query.vnp_TxnRef}</strong></p>
      )}

      <div className="flex gap-3 justify-center">
        <Link href="/dashboard/orders" className="rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-red-700">
          Xem đơn hàng
        </Link>
        <Link href="/dashboard/auctions" className="rounded-xl border px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Phiên đấu giá của tôi
        </Link>
      </div>
    </div>
  )
}
