import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { hasRole } from '@/lib/auth-types'
import { REFERRAL_DEFAULTS, invalidateReferralCache } from '@/lib/referral-settings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  return !!session?.user?.role && hasRole(session.user.role, 'ADMIN')
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [rows, totalReferrals, rewardedCount, pendingCount, pointsAgg, recent, topRaw] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { startsWith: 'referral.' } } }),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'REWARDED' } }),
    prisma.referral.count({ where: { status: 'PENDING' } }),
    prisma.pointTransaction.aggregate({
      _sum: { amount: true },
      where: { type: { in: ['REFERRAL_REFERRER', 'REFERRAL_REFEREE'] } },
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, status: true, code: true, referrerPoints: true, refereePoints: true,
        createdAt: true, qualifiedAt: true,
        referrer: { select: { email: true, profile: { select: { fullName: true } } } },
        referee: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.referral.groupBy({
      by: ['referrerId'],
      where: { status: 'REWARDED' },
      _count: { _all: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: 10,
    }),
  ])

  const saved = Object.fromEntries(rows.map((r) => [r.key.slice(9), r.value]))
  const settings = { ...REFERRAL_DEFAULTS, ...saved }

  // Bổ sung tên cho top referrers
  const topIds = topRaw.map((t) => t.referrerId)
  const topUsers = topIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topIds } },
        select: { id: true, email: true, pointsBalance: true, profile: { select: { fullName: true } } },
      })
    : []
  const topReferrers = topRaw.map((t) => {
    const u = topUsers.find((x) => x.id === t.referrerId)
    return {
      referrerId: t.referrerId,
      name: u?.profile?.fullName || u?.email || '—',
      count: t._count._all,
      pointsBalance: u?.pointsBalance ?? 0,
    }
  })

  return NextResponse.json({
    settings,
    stats: {
      totalReferrals,
      rewardedCount,
      pendingCount,
      pointsAwarded: pointsAgg._sum.amount ?? 0,
    },
    topReferrers,
    recent: recent.map((r) => ({
      id: r.id,
      status: r.status,
      code: r.code,
      referrerPoints: r.referrerPoints,
      refereePoints: r.refereePoints,
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
      referrer: r.referrer.profile?.fullName || r.referrer.email,
      referee: r.referee.profile?.fullName || r.referee.email,
    })),
  })
}

const updateSchema = z.object({
  key: z.enum(['ENABLED', 'REFERRER_POINTS', 'REFEREE_POINTS', 'MAX_REDEEM_PERCENT']),
  value: z.string().max(20),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { key, value } = parsed.data

  // Validate giá trị số cho các key điểm
  if (key !== 'ENABLED') {
    const n = parseInt(value, 10)
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: 'Giá trị phải là số ≥ 0' }, { status: 400 })
    if (key === 'MAX_REDEEM_PERCENT' && n > 100) return NextResponse.json({ error: 'Phần trăm tối đa là 100' }, { status: 400 })
  } else if (value !== 'true' && value !== 'false') {
    return NextResponse.json({ error: 'ENABLED phải là true/false' }, { status: 400 })
  }

  await prisma.siteSetting.upsert({
    where: { key: `referral.${key}` },
    create: { key: `referral.${key}`, value },
    update: { value },
  })

  invalidateReferralCache()
  return NextResponse.json({ success: true })
}
