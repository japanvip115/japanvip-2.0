import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { DB_KEY, DEFAULT_STYLE } from '@/lib/ai-style'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const row = await prisma.siteSetting.findUnique({ where: { key: DB_KEY } })
  const isCustom = !!row?.value?.trim()
  return Response.json({
    success: true,
    style: row?.value?.trim() || DEFAULT_STYLE,
    isCustom,
    default: DEFAULT_STYLE,
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { style } = await req.json()
  if (typeof style !== 'string' || style.trim().length < 20) {
    return Response.json({ error: 'Style không hợp lệ' }, { status: 400 })
  }
  await prisma.siteSetting.upsert({
    where: { key: DB_KEY },
    create: { key: DB_KEY, value: style.trim() },
    update: { value: style.trim() },
  })
  return Response.json({ success: true })
}

export async function DELETE() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await prisma.siteSetting.deleteMany({ where: { key: DB_KEY } })
  return Response.json({ success: true })
}
