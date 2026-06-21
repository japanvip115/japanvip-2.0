import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  idCardNumber: z.string().min(9).max(20).regex(/^[0-9]+$/, 'Số CCCD chỉ gồm chữ số'),
  idCardFront: z.string().url('Ảnh mặt trước không hợp lệ'),
  idCardBack: z.string().url('Ảnh mặt sau không hợp lệ'),
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
        idCardNumber: body.idCardNumber.trim(),
        idCardFront: body.idCardFront,
        idCardBack: body.idCardBack,
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
