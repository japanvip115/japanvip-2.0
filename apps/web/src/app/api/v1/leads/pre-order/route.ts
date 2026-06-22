import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

// Lưu Lead khi khách đã đăng nhập xem giá VN của hàng Pre Order.
// Idempotent: chỉ thêm mới vào list nuôi dưỡng, KHÔNG ghi đè subscriber đã có, KHÔNG gửi email ngay.
export async function POST() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return NextResponse.json({ ok: false, error: 'Chưa đăng nhập' }, { status: 401 })

  const name = (session.user as { name?: string | null }).name ?? undefined
  const existing = await prisma.subscriber.findUnique({ where: { email }, select: { id: true } })
  if (!existing) {
    await prisma.subscriber.create({
      data: { email, name, source: 'pre-order-lead', status: 'ACTIVE' },
    })
  }
  return NextResponse.json({ ok: true })
}
