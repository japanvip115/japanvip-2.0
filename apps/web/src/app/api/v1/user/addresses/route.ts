import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const addressSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  recipientName: z.string().min(1).max(255),
  phone: z.string().min(9).max(20),
  province: z.string().min(1).max(100),
  // Cải cách hành chính 2025: bỏ cấp Quận/Huyện → district không còn bắt buộc (gửi rỗng)
  district: z.string().max(100).optional().default(''),
  ward: z.string().min(1).max(100),
  street: z.string().min(1),
  isDefault: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ success: true, data: addresses })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = addressSchema.safeParse(body)
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

  const address = await prisma.address.create({
    data: {
      ...data,
      label: data.label ?? null,
      userId: session.user.id,
      isDefault: isDefault ?? false,
    },
  })

  return NextResponse.json({ success: true, data: address })
}
