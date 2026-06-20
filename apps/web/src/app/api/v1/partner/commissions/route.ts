import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const partner = await prisma.partnerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, refCode: true, defaultCommissionRate: true, totalEarned: true, totalPaid: true, status: true, bankName: true, bankAccount: true, bankHolder: true },
  })
  if (!partner) return NextResponse.json({ success: false, error: 'Không phải partner' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 20

  const [commissions, total] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.affiliateCommission.count({ where: { partnerId: partner.id } }),
  ])

  return NextResponse.json({ success: true, data: { partner, commissions, total } })
}
