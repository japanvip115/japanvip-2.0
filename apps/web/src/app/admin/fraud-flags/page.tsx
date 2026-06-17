import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { ResolveFraudFlagButton } from '@/components/admin/resolve-fraud-flag-button'

export const metadata: Metadata = { title: 'Admin — Cảnh Báo Gian Lận' }
export const dynamic = 'force-dynamic'

const SEVERITY_STYLES: Record<string, string> = {
  LOW:      'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
  MEDIUM:   'bg-orange-500/20 text-orange-300 ring-1 ring-inset ring-orange-500/30',
  HIGH:     'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/20',
  CRITICAL: 'bg-red-700/30 text-red-300 ring-1 ring-inset ring-red-600/40',
}

const TYPE_LABELS: Record<string, string> = {
  rapid_bid_velocity:         'Bid quá nhanh',
  new_account_high_bid:       'Tài khoản mới, giá cao',
  shill_bid_attempt:          'Cố gắng shill bid',
  same_ip_multi_account:      'Cùng IP đa tài khoản',
  multiple_auctions_same_ip:  'Nhiều phiên cùng IP',
  cross_auction_velocity:     'Velocity đa phiên',
  bid_retraction:             'Rút bid bất thường',
  deposit_manipulation:       'Thao túng cọc',
  fraudulent_payment:         'Gian lận thanh toán',
  account_takeover:           'Chiếm đoạt tài khoản',
}

export default async function FraudFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ resolved?: string; severity?: string; page?: string }>
}) {
  const { resolved, severity, page: pageParam } = await searchParams
  const showResolved = resolved === '1'
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const where = {
    resolved: showResolved,
    ...(severity ? { severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } : {}),
  }

  const [flags, total, openCount, criticalCount] = await Promise.all([
    prisma.fraudFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        resolver: { select: { email: true } },
      },
    }),
    prisma.fraudFlag.count({ where }),
    prisma.fraudFlag.count({ where: { resolved: false } }),
    prisma.fraudFlag.count({ where: { resolved: false, severity: 'CRITICAL' } }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cảnh Báo Gian Lận</h1>
          <p className="text-sm text-gray-400">{openCount} cảnh báo chưa xử lý · {criticalCount} CRITICAL</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {criticalCount > 0 && (
          <div className="rounded-lg bg-red-700/30 px-3 py-1.5 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-600/40">
            ⚠️ {criticalCount} CRITICAL cần xử lý ngay
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Chưa xử lý', resolved: '0' },
          { label: 'Đã xử lý', resolved: '1' },
        ].map((opt) => (
          <Link
            key={opt.resolved}
            href={`?resolved=${opt.resolved}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (showResolved ? '1' : '0') === opt.resolved
                ? 'bg-red-600 text-white'
                : 'border border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {opt.label}
          </Link>
        ))}
        <span className="text-gray-600">|</span>
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
          <Link
            key={s}
            href={severity === s ? `?resolved=${showResolved ? '1' : '0'}` : `?resolved=${showResolved ? '1' : '0'}&severity=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              severity === s
                ? SEVERITY_STYLES[s]
                : 'border border-gray-600 text-gray-500 hover:border-gray-500'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        {flags.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">Không có cảnh báo nào</p>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {flags.map((flag) => (
              <div key={flag.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEVERITY_STYLES[flag.severity]}`}>
                      {flag.severity}
                    </span>
                    <span className="text-sm font-semibold text-gray-200">
                      {TYPE_LABELS[flag.type] ?? flag.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Link href={`/admin/users/${flag.userId}`} className="text-blue-400 hover:underline">
                      {flag.user.profile?.fullName ?? flag.user.email}
                    </Link>
                    <span>·</span>
                    <span>{new Date(flag.createdAt).toLocaleString('vi-VN')}</span>
                    {flag.resolved && flag.resolver && (
                      <>
                        <span>·</span>
                        <span className="text-green-500">Đã xử lý bởi {flag.resolver.email}</span>
                      </>
                    )}
                  </div>
                  {flag.details && (
                    <p className="mt-1 text-xs text-gray-600 font-mono truncate max-w-xl">
                      {JSON.stringify(flag.details)}
                    </p>
                  )}
                </div>
                {!flag.resolved && (
                  <ResolveFraudFlagButton flagId={flag.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?resolved=${showResolved ? '1' : '0'}${severity ? `&severity=${severity}` : ''}&page=${p}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                p === page
                  ? 'bg-red-600 text-white'
                  : 'border border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
