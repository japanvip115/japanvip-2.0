import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar user={session.user as any} />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
    </div>
  )
}
