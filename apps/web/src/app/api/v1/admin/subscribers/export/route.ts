import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError } from '@/lib/api-response'

export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  const subs = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { email: true, name: true, phone: true, city: true, source: true, status: true, createdAt: true },
  })

  const header = 'email,name,phone,city,source,status,createdAt\n'
  const rows = subs.map(s =>
    [s.email, s.name || '', s.phone || '', s.city || '', s.source || '', s.status, s.createdAt.toISOString()]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n')

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="subscribers.csv"',
    },
  })
}
