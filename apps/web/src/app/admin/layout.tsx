import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { AdminSidebar } from '@/components/layout/admin-sidebar'

async function getSidebarCounts(): Promise<Record<string, number>> {
  try {
    const [bfjOrders, quickOrders, transactions, partners] = await Promise.all([
      prisma.bfjOrder.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.quickOrder.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count({ where: { status: 'PENDING' } }),
      prisma.partnerProfile.count({ where: { status: 'PENDING' } }),
    ])
    return {
      '/admin/orders': bfjOrders,
      '/admin/quick-orders': quickOrders,
      '/admin/finance': transactions,
      '/admin/affiliates': partners,
    }
  } catch {
    return {}
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const userRole = (session.user as any).role
  if (!hasRole(userRole, 'EDITOR')) redirect('/403')

  const counts = await getSidebarCounts()

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar user={{ name: session.user?.name, email: session.user?.email, role: userRole }} counts={counts} />
      <main className="flex-1 overflow-auto p-6 text-gray-100">{children}</main>
    </div>
  )
}
