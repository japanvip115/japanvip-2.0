import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  recipientName: z.string().min(1).max(255).optional(),
  phone: z.string().min(9).max(20).optional(),
  province: z.string().min(1).max(100).optional(),
  district: z.string().max(100).optional(),
  ward: z.string().min(1).max(100).optional(),
  street: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await prisma.address.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
  }

  const { isDefault, ...data } = parsed.data

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.address.update({
    where: { id },
    data: { ...data, ...(isDefault !== undefined ? { isDefault } : {}) },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await prisma.address.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  await prisma.address.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
