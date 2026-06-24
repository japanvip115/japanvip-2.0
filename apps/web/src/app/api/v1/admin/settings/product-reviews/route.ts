import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'

const KEY = 'product_reviews_enabled'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAdmin = (s: any) => hasRole(s?.user?.role, 'ADMIN')

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  return Response.json({ enabled: row?.value === 'true' })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!isAdmin(session)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const value = body.enabled ? 'true' : 'false'
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
  return Response.json({ success: true, enabled: body.enabled === true })
}
