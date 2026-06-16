import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const schema = z.object({
  depositProofUrl: z.string().min(1),
  depositProofNote: z.string().max(500).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await params

  try {
    const order = await prisma.bfjOrder.findFirst({
      where: { id, customerId: session.user!.id },
      select: { id: true, status: true, depositProofUrl: true },
    })
    if (!order) return apiError('Không tìm thấy đơn hàng', 404)
    if (order.status !== 'AWAITING_DEPOSIT') {
      return apiError('Đơn hàng không ở trạng thái chờ đặt cọc', 400)
    }

    const body = schema.parse(await req.json())

    await prisma.bfjOrder.update({
      where: { id },
      data: {
        depositProofUrl: body.depositProofUrl,
        depositProofNote: body.depositProofNote ?? null,
        depositSubmittedAt: new Date(),
      },
    })

    return apiSuccess(null, 'Đã gửi biên lai thành công')
  } catch (err) {
    return handleApiError(err)
  }
}
