import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth-types'
import { PartnerSidebar } from '@/components/layout/partner-sidebar'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasRole((session.user as any).role, 'PARTNER')) redirect('/403')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PartnerSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
