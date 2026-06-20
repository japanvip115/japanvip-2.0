import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartnerCommissionsClient } from '@/components/partner/partner-commissions-client'

export const metadata: Metadata = { title: 'Hoa Hồng — Japan VIP Partner' }
export const dynamic = 'force-dynamic'

export default async function PartnerCommissionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const partner = await prisma.partnerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      refCode: true,
      defaultCommissionRate: true,
      totalEarned: true,
      totalPaid: true,
      status: true,
      bankName: true,
      bankAccount: true,
      bankHolder: true,
    },
  })

  if (!partner) redirect('/partner')

  const commissions = await prisma.affiliateCommission.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const stats = {
    pending: commissions.filter((c) => c.status === 'PENDING').reduce((s, c) => s + Number(c.commissionAmount), 0),
    approved: commissions.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + Number(c.commissionAmount), 0),
    paid: Number(partner.totalPaid),
    total: Number(partner.totalEarned),
  }

  return (
    <PartnerCommissionsClient
      partner={{
        ...partner,
        defaultCommissionRate: Number(partner.defaultCommissionRate),
        totalEarned: Number(partner.totalEarned),
        totalPaid: Number(partner.totalPaid),
      }}
      commissions={commissions.map((c) => ({
        ...c,
        orderAmount: Number(c.orderAmount),
        commissionRate: Number(c.commissionRate),
        commissionAmount: Number(c.commissionAmount),
        createdAt: c.createdAt.toISOString(),
        paidAt: c.paidAt?.toISOString() ?? null,
      }))}
      stats={stats}
      appUrl={process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'}
    />
  )
}
