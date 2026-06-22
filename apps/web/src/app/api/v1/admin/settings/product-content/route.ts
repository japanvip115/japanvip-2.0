import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

// Lưu nội dung khối phải trang sản phẩm (cam kết + ô giao hàng) — admin tự sửa text.
export async function PUT(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { commitments, shippingNotes } = await req.json()
  if (typeof commitments !== 'string' || typeof shippingNotes !== 'string') {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: 'product.commitments' },
      create: { key: 'product.commitments', value: commitments },
      update: { value: commitments },
    }),
    prisma.siteSetting.upsert({
      where: { key: 'product.shipping_notes' },
      create: { key: 'product.shipping_notes', value: shippingNotes },
      update: { value: shippingNotes },
    }),
  ])
  return NextResponse.json({ ok: true })
}
