import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { getOrCreateReferralCode } from '@/lib/referral.service'
import { getReferralPoints, isReferralEnabled } from '@/lib/referral-settings'
import { ReferralShareBox } from '@/components/referral/referral-share-box'
import { Gift, Users, Sparkles, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Giới Thiệu Bạn Bè' }
export const dynamic = 'force-dynamic'

const POINT_TYPE_LABELS: Record<string, string> = {
  REFERRAL_REFERRER: 'Thưởng giới thiệu',
  REFERRAL_REFEREE: 'Điểm chào mừng',
  REDEEM_AUCTION: 'Dùng điểm — đấu giá',
  REDEEM_ORDER: 'Dùng điểm — đơn hàng',
  ADMIN_ADJUST: 'Điều chỉnh',
  REFUND: 'Hoàn điểm',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ đặt giá', cls: 'bg-yellow-100 text-yellow-700' },
  REWARDED: { label: 'Đã thưởng', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-gray-100 text-gray-500' },
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return 'Khách hàng'
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
}

const fmt = (n: number) => n.toLocaleString('vi-VN')

export default async function ReferralPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [enabled, code, user, reward, referrals, pointTxns] = await Promise.all([
    isReferralEnabled(),
    getOrCreateReferralCode(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { pointsBalance: true } }),
    getReferralPoints(),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, status: true, referrerPoints: true, createdAt: true,
        referee: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true },
    }),
  ])

  const rewardedCount = referrals.filter((r) => r.status === 'REWARDED').length
  const pendingCount = referrals.length - rewardedCount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Gift className="h-6 w-6 text-brand-red" /> Giới Thiệu Bạn Bè
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Mời bạn bè tham gia đấu giá — cả hai cùng nhận điểm thưởng để giảm giá đơn hàng.
        </p>
      </div>

      {!enabled && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Chương trình giới thiệu đang tạm dừng. Bạn vẫn có thể chia sẻ mã, điểm sẽ được cộng khi chương trình mở lại.
        </div>
      )}

      {/* Thẻ điểm */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-brand-red p-5 text-white">
          <p className="flex items-center gap-1.5 text-xs text-red-200"><Sparkles className="h-3.5 w-3.5" /> Điểm hiện có</p>
          <p className="mt-1 text-3xl font-black">{fmt(user?.pointsBalance ?? 0)}</p>
          <p className="text-[11px] text-red-200">≈ {fmt(user?.pointsBalance ?? 0)}₫ giảm giá</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs text-gray-500"><Users className="h-3.5 w-3.5" /> Đã mời</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{referrals.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs text-gray-500"><Gift className="h-3.5 w-3.5" /> Đã thưởng</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{rewardedCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs text-gray-500"><Clock className="h-3.5 w-3.5" /> Chờ đặt giá</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chia sẻ */}
        <div className="rounded-xl border bg-white p-6">
          <ReferralShareBox code={code} />
          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p className="mb-2 font-semibold text-gray-800">Cách hoạt động</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Chia sẻ mã / link cho bạn bè</li>
              <li>Bạn của bạn đăng ký bằng mã này</li>
              <li>Khi họ <b>đặt giá lần đầu</b>, bạn nhận <b className="text-brand-red">{fmt(reward.referrer)} điểm</b>, họ nhận <b className="text-brand-red">{fmt(reward.referee)} điểm</b></li>
              <li>Dùng điểm để giảm tối đa <b>{reward.maxRedeemPercent}%</b> giá trị đơn hàng / phiên thắng</li>
            </ol>
          </div>
        </div>

        {/* Danh sách mời */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Bạn bè đã mời</h2>
          </div>
          {referrals.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Chưa có ai. Hãy chia sẻ mã của bạn!</p>
          ) : (
            <div className="max-h-80 divide-y overflow-y-auto">
              {referrals.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {r.referee.profile?.fullName || maskEmail(r.referee.email)}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.status === 'REWARDED' && r.referrerPoints > 0 && (
                        <span className="text-sm font-bold text-emerald-600">+{fmt(r.referrerPoints)}</span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lịch sử điểm */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-bold text-gray-900">Lịch sử điểm thưởng</h2>
        </div>
        {pointTxns.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Chưa có giao dịch điểm nào</p>
        ) : (
          <div className="divide-y">
            {pointTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{POINT_TYPE_LABELS[t.type] ?? t.type}</p>
                  <p className="text-xs text-gray-400">
                    {t.note ? `${t.note} · ` : ''}{new Date(t.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className={`text-sm font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
                  </p>
                  <p className="text-[11px] text-gray-400">Còn {fmt(t.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
