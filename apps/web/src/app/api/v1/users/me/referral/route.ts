import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { getOrCreateReferralCode } from '@/lib/referral.service'
import { getReferralPoints, isReferralEnabled } from '@/lib/referral-settings'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Unauthorized', 401)

  const userId = session.user.id

  try {
    const [enabled, code, user, points, referrals, pointTxns] = await Promise.all([
      isReferralEnabled(),
      getOrCreateReferralCode(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { pointsBalance: true } }),
      getReferralPoints(),
      prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          referrerPoints: true,
          createdAt: true,
          qualifiedAt: true,
          referee: { select: { profile: { select: { fullName: true } }, email: true } },
        },
      }),
      prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, type: true, amount: true, balanceAfter: true, note: true, createdAt: true },
      }),
    ])

    const totalReferred = referrals.length
    const rewardedCount = referrals.filter((r) => r.status === 'REWARDED').length
    const earnedFromReferral = referrals.reduce((s, r) => s + (r.status === 'REWARDED' ? r.referrerPoints : 0), 0)

    // Ẩn bớt email người được mời để bảo vệ riêng tư
    const maskedReferrals = referrals.map((r) => ({
      id: r.id,
      status: r.status,
      points: r.referrerPoints,
      name: r.referee.profile?.fullName || maskEmail(r.referee.email),
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
    }))

    return apiSuccess({
      enabled,
      code,
      pointsBalance: user?.pointsBalance ?? 0,
      reward: points,
      stats: { totalReferred, rewardedCount, pendingCount: totalReferred - rewardedCount, earnedFromReferral },
      referrals: maskedReferrals,
      pointHistory: pointTxns,
    })
  } catch (err) {
    return handleApiError(err)
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return 'Khách hàng'
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
}
