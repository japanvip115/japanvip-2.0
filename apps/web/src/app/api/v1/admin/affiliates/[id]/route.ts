import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { action, note } = await req.json()

  if (action === 'approve') {
    const commission = await prisma.affiliateCommission.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: session.user.id, note: note ?? null },
    })
    await prisma.partnerProfile.update({
      where: { id: commission.partnerId },
      data: { totalEarned: { increment: commission.commissionAmount } },
    })
  } else if (action === 'reject') {
    await prisma.affiliateCommission.update({ where: { id }, data: { status: 'REJECTED', note: note ?? null } })
  } else if (action === 'pay') {
    const commission = await prisma.affiliateCommission.findUnique({ where: { id } })
    if (!commission || commission.status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Chỉ thanh toán hoa hồng đã duyệt' }, { status: 400 })
    }
    await prisma.affiliateCommission.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } })
    await prisma.partnerProfile.update({
      where: { id: commission.partnerId },
      data: { totalPaid: { increment: commission.commissionAmount } },
    })
  }

  return NextResponse.json({ success: true })
}
