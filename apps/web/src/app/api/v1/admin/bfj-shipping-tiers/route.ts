import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const tiers = await prisma.bfjShippingTier.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ success: true, data: tiers })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body: { label: string; maxWeightKg: number | null; priceVnd: number; actualCostVnd?: number; estimatedDays: string }[] = await req.json()

  await prisma.$transaction([
    prisma.bfjShippingTier.deleteMany(),
    prisma.bfjShippingTier.createMany({
      data: body.map((t, i) => ({
        label: t.label,
        maxWeightKg: t.maxWeightKg,
        priceVnd: t.priceVnd,
        actualCostVnd: t.actualCostVnd ?? 0,
        estimatedDays: t.estimatedDays,
        sortOrder: i + 1,
      })),
    }),
  ])

  const tiers = await prisma.bfjShippingTier.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ success: true, data: tiers })
}
