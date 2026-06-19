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
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, name, city, photo_url as "photoUrl", text, rating, sort_order as "sortOrder", is_active as "isActive"
    FROM testimonials ORDER BY sort_order ASC, created_at ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { name, city, photoUrl, text, rating = 5, sortOrder = 0 } = await req.json()
  if (!name?.trim() || !text?.trim()) return NextResponse.json({ error: 'Thiếu tên hoặc nội dung' }, { status: 400 })

  const [row] = await prisma.$queryRaw<any[]>`
    INSERT INTO testimonials (name, city, photo_url, text, rating, sort_order)
    VALUES (${name.trim()}, ${(city || '').trim()}, ${photoUrl || null}, ${text.trim()}, ${rating}, ${sortOrder})
    RETURNING id, name, city, photo_url as "photoUrl", text, rating, sort_order as "sortOrder", is_active as "isActive"
  `
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { id, name, city, photoUrl, text, rating, sortOrder, isActive } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  await prisma.$executeRaw`
    UPDATE testimonials SET
      name = ${name}, city = ${city}, photo_url = ${photoUrl ?? null},
      text = ${text}, rating = ${rating ?? 5}, sort_order = ${sortOrder ?? 0},
      is_active = ${isActive ?? true}, updated_at = now()
    WHERE id = ${id}::uuid
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const err = guard(session); if (err) return err

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  await prisma.$executeRaw`DELETE FROM testimonials WHERE id = ${id}::uuid`
  return NextResponse.json({ ok: true })
}
