import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth-types'
import { AdminSidebar } from '@/components/layout/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasRole((session.user as any).role, 'ADMIN')) redirect('/403')

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6 text-gray-100">{children}</main>
    </div>
  )
}
