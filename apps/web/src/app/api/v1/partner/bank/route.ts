import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  bankName: z.string().min(2).max(100),
  bankAccount: z.string().min(6).max(30).regex(/^[0-9]+$/, 'Số tài khoản chỉ gồm chữ số'),
  bankHolder: z.string().min(2).max(100),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })

  try {
    const body = schema.parse(await req.json())

    const partner = await prisma.partnerProfile.findUnique({ where: { userId: session.user.id } })
    if (!partner) return NextResponse.json({ success: false, error: 'Bạn chưa phải là cộng tác viên' }, { status: 403 })

    await prisma.partnerProfile.update({
      where: { id: partner.id },
      data: {
        bankName: body.bankName.trim(),
        bankAccount: body.bankAccount.trim(),
        bankHolder: body.bankHolder.trim().toUpperCase(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}
