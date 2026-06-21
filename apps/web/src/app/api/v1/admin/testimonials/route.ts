import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function guard(session: any) {
  if (!hasRole(session?.user?.role, 'ADMIN'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET() {
  const rows = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { name, city, photoUrl, text, rating = 5, type = 'GENERAL', sortOrder = 0 } = await req.json()
  if (!name?.trim() || !text?.trim()) return NextResponse.json({ error: 'Thiếu tên hoặc nội dung' }, { status: 400 })

  const row = await prisma.testimonial.create({
    data: { name: name.trim(), city: (city || '').trim(), photoUrl: photoUrl || null, text: text.trim(), rating, type: type === 'AUCTION' ? 'AUCTION' : 'GENERAL', sortOrder },
  })
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { id, name, city, photoUrl, text, rating, type, sortOrder, isActive } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  await prisma.testimonial.update({
    where: { id },
    data: { name, city, photoUrl: photoUrl ?? null, text, rating: rating ?? 5, ...(type ? { type: type === 'AUCTION' ? 'AUCTION' : 'GENERAL' } : {}), sortOrder: sortOrder ?? 0, isActive: isActive ?? true },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  await prisma.testimonial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
