import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Tên danh mục không được trống' }, { status: 400 })

  const slug = toSlug(name.trim())
  const category = await prisma.blogCategory.create({ data: { name: name.trim(), slug } })
  return NextResponse.json(category, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  // Unset category on posts before deleting
  await prisma.blogPost.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
  await prisma.blogCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
