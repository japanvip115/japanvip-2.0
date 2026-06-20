import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 20

  const partners = await prisma.partnerProfile.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      user: { select: { email: true, profile: { select: { fullName: true } } } },
      commissions: { select: { commissionAmount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * take,
    take,
  })

  const total = await prisma.partnerProfile.count({ where: status ? { status: status as any } : undefined })
  return NextResponse.json({ success: true, data: { partners, total } })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { partnerId, action, commissionRate } = await req.json()

  if (action === 'approve') {
    await prisma.partnerProfile.update({
      where: { id: partnerId },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: session.user.id },
    })
    const partner = await prisma.partnerProfile.findUnique({ where: { id: partnerId }, select: { userId: true } })
    if (partner) await prisma.user.update({ where: { id: partner.userId }, data: { role: 'PARTNER' } })
  } else if (action === 'suspend') {
    await prisma.partnerProfile.update({ where: { id: partnerId }, data: { status: 'SUSPENDED' } })
  } else if (action === 'set_rate' && commissionRate !== undefined) {
    await prisma.partnerProfile.update({ where: { id: partnerId }, data: { defaultCommissionRate: commissionRate } })
  }

  return NextResponse.json({ success: true })
}
