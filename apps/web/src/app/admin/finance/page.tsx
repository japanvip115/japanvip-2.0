import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import type { TransactionType, TransactionStatus, TransactionDirection } from '@japanvip/db'
import { DepositActions } from './deposit-actions'

export const metadata: Metadata = { title: 'Admin — Tài Chính' }
export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<TransactionStatus, string> = {
  PENDING:   'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
  COMPLETED: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20',
  FAILED:    'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  REVERSED:  'bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20',
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING:   'Chờ xử lý',
  COMPLETED: 'Hoàn thành',
  FAILED:    'Thất bại',
  REVERSED:  'Đã hoàn',
}

const TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT:           'Nạp tiền',
  WITHDRAWAL:        'Rút tiền',
  BFJ_PAYMENT:       'Thanh toán Mua Hộ',
  BFJ_REFUND:        'Hoàn tiền Mua Hộ',
  AUCTION_HOLD:      'Khoá cọc đấu giá',
  AUCTION_RELEASE:   'Mở khoá cọc',
  AUCTION_SETTLE:    'Thanh toán thắng đấu giá',
  COMMISSION_PAYOUT: 'Hoa hồng đối tác',
  ADJUSTMENT:        'Điều chỉnh',
}

type SearchParams = Promise<{ status?: string; type?: string; page?: string; q?: string }>

export default async function AdminFinancePage({ searchParams }: { searchParams: SearchParams }) {
  const { status = '', type = '', page = '1', q = '' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const take = 25
  const skip = (pageNum - 1) * take

  const where = {
    ...(status ? { status: status as TransactionStatus } : {}),
    ...(type ? { type: type as TransactionType } : {}),
    ...(q ? {
      OR: [
        { txnNumber: { contains: q, mode: 'insensitive' as const } },
        { user: { email: { contains: q, mode: 'insensitive' as const } } },
      ],
    } : {}),
  }

  const [transactions, total, stats, pendingDeposits] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { type: 'DEPOSIT', status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
  ])

  const totalPages = Math.ceil(total / take)

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams({ status, type, page, q, ...overrides })
    ;['status', 'type', 'q'].forEach((k) => { if (!p.get(k)) p.delete(k) })
    if (p.get('page') === '1') p.delete('page')
    const s = p.toString()
    return `/admin/finance${s ? `?${s}` : ''}`
  }

  const totalCompleted = Number(stats._sum.amount ?? 0)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản Lý Tài Chính</h1>
          <p className="mt-0.5 text-sm text-gray-500">Lịch sử giao dịch ví người dùng</p>
        </div>
      </div>

      {/* Pending deposit approvals */}
      {pendingDeposits.length > 0 && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
              {pendingDeposits.length}
            </span>
            <h2 className="text-sm font-bold text-yellow-400">Yêu cầu đặt cọc chờ duyệt</h2>
          </div>
          <div className="space-y-2">
            {pendingDeposits.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 bg-gray-800/80 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      +{Number(t.amount).toLocaleString('vi-VN')}₫
                    </span>
                    <span className="font-mono text-xs text-gray-400">{t.txnNumber}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-300">{t.user.profile?.fullName ?? '—'}</span>
                    {' · '}{t.user.email}
                    {t.paymentRef && <span className="ml-2 font-mono">Mã CK: {t.paymentRef}</span>}
                    {' · '}{new Date(t.createdAt).toLocaleString('vi-VN')}
                  </div>
                  {t.notes && (() => {
                    const proofUrl = t.notes.startsWith('proof:') ? t.notes.split('proof:')[1]?.split('|')[0] : null
                    const noteText = t.notes.includes('|') ? t.notes.split('|').slice(1).join('|') : (!t.notes.startsWith('proof:') && t.notes !== 'Chờ xác nhận' ? t.notes : null)
                    return (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {proofUrl && (
                          <a href={proofUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20 transition"
                          >
                            🖼 Xem phiếu chuyển khoản →
                          </a>
                        )}
                        {noteText && <span className="text-xs text-gray-500 italic">{noteText}</span>}
                      </div>
                    )
                  })()}
                </div>
                <DepositActions
                  txnId={t.id}
                  txnNumber={t.txnNumber}
                  amount={Number(t.amount)}
                  userName={t.user.profile?.fullName ?? t.user.email ?? '—'}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng GD hoàn thành', value: totalCompleted.toLocaleString('vi-VN') + '₫', color: 'text-green-400' },
          { label: 'Tổng giao dịch', value: total.toLocaleString('vi-VN'), color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="mb-4 flex flex-wrap items-center gap-3">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          name="type"
          defaultValue={type}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        >
          <option value="">Tất cả loại GD</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <input
          name="q"
          defaultValue={q}
          placeholder="Mã GD hoặc email..."
          className="ml-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        />
        <button type="submit" className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white cursor-pointer">
          Lọc
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mã GD</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Loại</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Số tiền</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">Không có giao dịch nào</td>
              </tr>
            )}
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{txn.txnNumber}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-300">{txn.user.profile?.fullName ?? '—'}</div>
                  <div className="text-xs text-gray-500">{txn.user.email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{TYPE_LABELS[txn.type] ?? txn.type}</td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${txn.direction === 'CREDIT' ? 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20' : 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20'}`}>
                    {txn.direction === 'CREDIT' ? '+' : '-'}
                    {Number(txn.amount).toLocaleString('vi-VN')}₫
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[txn.status]}`}>
                    {STATUS_LABELS[txn.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(txn.createdAt).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page !== '1' && (
            <Link href={buildUrl({ page: String(pageNum - 1) })} className="flex h-8 w-8 items-center justify-center rounded border border-gray-700 text-sm text-gray-400 hover:bg-gray-700 transition-colors">←</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildUrl({ page: String(p) })}
              className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${p === pageNum ? 'bg-red-600 text-white hover:bg-red-500' : 'border border-gray-700 text-gray-400 hover:bg-gray-700'}`}
            >{p}</Link>
          ))}
          {pageNum < totalPages && (
            <Link href={buildUrl({ page: String(pageNum + 1) })} className="flex h-8 w-8 items-center justify-center rounded border border-gray-700 text-sm text-gray-400 hover:bg-gray-700 transition-colors">→</Link>
          )}
        </div>
      )}
    </div>
  )
}
