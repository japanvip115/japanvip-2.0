import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { invalidateFraudCache, FRAUD_DEFAULTS } from '@/lib/fraud-settings'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN'
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await prisma.siteSetting.findMany({
    where: { key: { startsWith: 'fraud.' } },
  })
  const saved = Object.fromEntries(rows.map((r) => [r.key.slice(6), r.value]))
  const merged = { ...FRAUD_DEFAULTS, ...saved }

  return NextResponse.json({ settings: merged })
}

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = updateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { key, value } = body.data

  // Chỉ cho phép update key có trong FRAUD_DEFAULTS
  if (!(key in FRAUD_DEFAULTS)) {
    return NextResponse.json({ error: 'Unknown setting key' }, { status: 400 })
  }

  await prisma.siteSetting.upsert({
    where: { key: `fraud.${key}` },
    create: { key: `fraud.${key}`, value },
    update: { value },
  })

  invalidateFraudCache()

  return NextResponse.json({ success: true })
}
