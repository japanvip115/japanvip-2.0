import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const rates = await prisma.bfjFreightRate.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ success: true, data: rates })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body: {
      id?: string
      minWeightKg: number
      maxWeightKg: number | null
      regularPricePerKg: number
      difficultPricePerKg: number
      estimatedDays: string
      sortOrder: number
    }[] = await req.json()

    await prisma.$transaction([
      prisma.bfjFreightRate.deleteMany(),
      ...body.map((r, i) =>
        prisma.bfjFreightRate.create({
          data: {
            minWeightKg: r.minWeightKg,
            maxWeightKg: r.maxWeightKg,
            regularPricePerKg: r.regularPricePerKg,
            difficultPricePerKg: r.difficultPricePerKg,
            estimatedDays: r.estimatedDays,
            sortOrder: r.sortOrder ?? i,
          },
        })
      ),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bfj-freight-rates PUT]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
