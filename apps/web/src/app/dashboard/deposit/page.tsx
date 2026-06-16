import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { DepositRequestForm } from '@/components/wallet/deposit-request-form'

export const metadata: Metadata = { title: 'Đặt Cọc Tham Gia Đấu Giá' }
export const dynamic = 'force-dynamic'

const BANK_INFO = {
  stk: '1234 5678 9012',
  bankName: 'MB Bank',
  owner: 'Japan VIP',
}

export default async function DepositPage() {
  const session = await auth()
  const userId = session!.user!.id

  const deposits = await prisma.transaction.findMany({
    where: { userId, type: 'DEPOSIT' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      txnNumber: true,
      amount: true,
      paymentRef: true,
      status: true,
      notes: true,
      createdAt: true,
    },
  })

  const initialDeposits = deposits.map((d) => ({
    id: d.id,
    txnNumber: d.txnNumber,
    amount: Number(d.amount),
    paymentRef: d.paymentRef ?? '',
    status: d.status as string,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đặt Cọc Tham Gia Đấu Giá</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quý khách cần đặt cọc một lần để được tham gia tất cả các phiên đấu giá.
          Tiền cọc sẽ được hoàn lại sau khi phiên kết thúc.
        </p>
      </div>

      {/* Process steps */}
      <div className="rounded-xl bg-gray-50 border p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Quy trình</p>
        <div className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Chuyển khoản đặt cọc', desc: 'Theo thông tin tài khoản bên dưới' },
            { step: '2', title: 'Gửi phiếu xác nhận', desc: 'Tải ảnh phiếu CK + nhập mã giao dịch' },
            { step: '3', title: 'Japan VIP duyệt', desc: 'Trong 1–2 giờ làm việc (08:00–18:30)' },
            { step: '4', title: 'Tự do tham gia đặt giá', desc: 'Cọc được hoàn sau khi phiên kết thúc' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white">
                {step}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <DepositRequestForm userId={userId} bankInfo={BANK_INFO} initialDeposits={initialDeposits} />

      {/* Contact */}
      <p className="text-center text-xs text-gray-400">
        Cần hỗ trợ? Liên hệ hotline{' '}
        <a href="tel:0988969896" className="font-semibold text-brand-red">0988.969.896</a>
        {' '}(08:00–18:30 mỗi ngày)
      </p>
    </div>
  )
}
