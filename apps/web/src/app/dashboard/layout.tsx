import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'

// Khu vực cá nhân — không cho index (trang riêng tư, không có giá trị SEO).
export const metadata: Metadata = { robots: { index: false, follow: false } }

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
