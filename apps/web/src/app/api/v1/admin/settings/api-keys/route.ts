import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session || !hasRole((session.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'api_key_content' } })
  return Response.json({ key: setting?.value ?? null })
}

export async function POST() {
  const session = await auth()
  if (!session || !hasRole((session.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const key = 'jvip_' + randomBytes(32).toString('hex')
  await prisma.siteSetting.upsert({
    where: { key: 'api_key_content' },
    create: { key: 'api_key_content', value: key },
    update: { value: key },
  })
  return Response.json({ key })
}
