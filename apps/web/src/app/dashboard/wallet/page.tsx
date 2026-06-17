import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getWalletBalance } from '@/modules/payment/wallet.service'
import { prisma } from '@japanvip/db'
import { formatVND } from '@japanvip/utils'
import { DepositRequestForm } from '@/components/wallet/deposit-request-form'
import { WithdrawForm } from '@/components/wallet/withdraw-form'

export const metadata: Metadata = { title: 'Ví Tiền' }
export const dynamic = 'force-dynamic'

const TXN_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Nạp tiền',
  WITHDRAWAL: 'Rút tiền',
  BFJ_PAYMENT: 'Thanh toán Mua Hộ',
  BFJ_REFUND: 'Hoàn tiền Mua Hộ',
  AUCTION_HOLD: 'Giữ tiền đấu giá',
  AUCTION_RELEASE: 'Giải phóng tiền giữ',
  AUCTION_SETTLE: 'Thanh toán đấu giá',
  COMMISSION_PAYOUT: 'Thanh toán hoa hồng',
  ADJUSTMENT: 'Điều chỉnh',
}

const TXN_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Từ chối',
  REVERSED: 'Đã hoàn',
}

const TXN_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED:    'bg-red-100 text-red-600',
  REVERSED:  'bg-gray-100 text-gray-500',
}

const BANK_INFO = {
  stk: '1234 5678 9012',
  bankName: 'MB Bank',
  owner: 'Japan VIP',
}

export default async function WalletPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const pendingDeposits = transactions.filter((t) => t.type === 'DEPOSIT' && t.status === 'PENDING')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ví Tiền</h1>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-brand-red p-5 text-white">
          <p className="text-sm text-red-200">Số dư khả dụng</p>
          <p className="mt-1 text-3xl font-black">{formatVND(balance.available)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Tổng số dư</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatVND(balance.balance)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Đang giữ (đấu giá)</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{formatVND(balance.lockedBalance)}</p>
        </div>
      </div>

      {/* Pending deposits */}
      {pendingDeposits.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-3 text-sm font-bold text-yellow-800">
            ⏳ Yêu cầu đặt cọc đang chờ xác nhận ({pendingDeposits.length})
          </p>
          <div className="space-y-2">
            {pendingDeposits.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-white border border-yellow-100 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">+{formatVND(Number(t.amount))}</p>
                  <p className="text-xs text-gray-400">
                    {t.txnNumber} · Mã CK: <span className="font-mono">{t.paymentRef}</span>
                  </p>
                </div>
                <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
                  Chờ duyệt
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-yellow-600">Japan VIP sẽ xác nhận trong 1–2 giờ làm việc (08:00–18:30)</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="mb-3 text-sm font-bold text-gray-700">Đặt cọc tham gia đấu giá</p>
          <DepositRequestForm userId={userId} bankInfo={BANK_INFO} />
        </div>
        {balance.available > 0 && (
          <div className="flex items-end">
            <WithdrawForm availableBalance={balance.available} />
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-bold text-gray-900">Lịch sử giao dịch</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="py-12 text-center text-gray-400 text-sm">Chưa có giao dịch nào</p>
        ) : (
          <div className="divide-y">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">
                      {TXN_TYPE_LABELS[txn.type] ?? txn.type}
                    </p>
                    {txn.status !== 'COMPLETED' && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TXN_STATUS_COLORS[txn.status]}`}>
                        {TXN_STATUS_LABELS[txn.status]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {txn.txnNumber}
                    {txn.paymentRef && <span className="ml-1">· {txn.paymentRef}</span>}
                    {' · '}{new Date(txn.createdAt).toLocaleString('vi-VN')}
                  </p>
                  {txn.status === 'FAILED' && txn.notes && (
                    <p className="text-xs text-red-500">{txn.notes}</p>
                  )}
                </div>
                <p className={`ml-4 flex-shrink-0 text-sm font-bold ${
                  txn.status === 'PENDING' ? 'text-yellow-600' :
                  txn.status === 'FAILED' ? 'text-gray-400 line-through' :
                  txn.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {txn.direction === 'CREDIT' ? '+' : '-'}{formatVND(Number(txn.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
