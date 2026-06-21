import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { AdminAffiliatesClient } from '@/components/admin/affiliates-client'

export const metadata: Metadata = { title: 'Admin — Quản Lý Hoa Hồng' }
export const dynamic = 'force-dynamic'

export default async function AdminAffiliatesPage() {
  const [partnersRaw, pendingCommissions] = await Promise.all([
    prisma.partnerProfile.findMany({
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        commissions: { select: { commissionAmount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.affiliateCommission.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: {
        partner: {
          select: {
            refCode: true,
            bankName: true,
            bankAccount: true,
            bankHolder: true,
            user: { select: { email: true, profile: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners = partnersRaw as any[]

  return (
    <AdminAffiliatesClient
      partners={partners.map((p) => ({
        id: p.id,
        refCode: p.refCode,
        status: p.status,
        defaultCommissionRate: Number(p.defaultCommissionRate),
        totalEarned: Number(p.totalEarned),
        totalPaid: Number(p.totalPaid),
        createdAt: p.createdAt.toISOString(),
        approvedAt: p.approvedAt?.toISOString() ?? null,
        email: p.user?.email ?? '',
        fullName: p.user?.profile?.fullName ?? null,
        phone: null,
        bankName: p.bankName,
        bankAccount: p.bankAccount,
        bankHolder: p.bankHolder,
        idCardNumber: p.idCardNumber ?? null,
        idCardFront: p.idCardFront ?? null,
        idCardBack: p.idCardBack ?? null,
        pendingAmount: (p.commissions ?? []).filter((c: any) => c.status === 'PENDING').reduce((s: number, c: any) => s + Number(c.commissionAmount), 0),
        approvedAmount: (p.commissions ?? []).filter((c: any) => c.status === 'APPROVED').reduce((s: number, c: any) => s + Number(c.commissionAmount), 0),
      }))}
      commissions={pendingCommissions.map((c) => ({
        id: c.id,
        orderRef: c.orderRef,
        productName: c.productName,
        orderAmount: Number(c.orderAmount),
        commissionRate: Number(c.commissionRate),
        commissionAmount: Number(c.commissionAmount),
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        paidAt: c.paidAt?.toISOString() ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partnerRefCode: (c.partner as any)?.refCode ?? '',
        partnerName: (c.partner as any)?.user?.profile?.fullName ?? (c.partner as any)?.user?.email ?? '',
        bankName: (c.partner as any)?.bankName ?? null,
        bankAccount: (c.partner as any)?.bankAccount ?? null,
        bankHolder: (c.partner as any)?.bankHolder ?? null,
      }))}
    />
  )
}
