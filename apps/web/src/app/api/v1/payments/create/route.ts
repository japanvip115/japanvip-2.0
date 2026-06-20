import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'
import { getVnpayConfig } from '@/lib/payments/vnpay-config'
import { buildPaymentUrl, vnpDate } from '@/lib/payments/vnpay'

const schema = z.object({
  purpose: z.enum(['AUCTION_SETTLEMENT', 'BFJ_DEPOSIT']),
  referenceId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return apiError('Vui lòng đăng nhập.', 401)
  const userId = session.user.id

  const { allowed } = await rateLimit(req, 'default', userId)
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau.', 429)

  try {
    const body = schema.parse(await req.json())

    const config = await getVnpayConfig()
    if (!config || !config.enabled) {
      return apiError('Cổng thanh toán chưa được kích hoạt. Vui lòng liên hệ Japan VIP.', 503)
    }
    if (!config.returnUrl) return apiError('Cổng thanh toán chưa cấu hình Return URL.', 503)

    // Xác định số tiền từ DB (không tin client)
    let amount = 0
    let orderInfo = ''
    let referenceType = ''

    if (body.purpose === 'AUCTION_SETTLEMENT') {
      const settlement = await prisma.auctionSettlement.findUnique({
        where: { id: body.referenceId },
        select: { id: true, winnerId: true, totalPayable: true, status: true },
      })
      if (!settlement) return apiError('Không tìm thấy khoản thanh toán.', 404)
      if (settlement.winnerId !== userId) return apiError('Bạn không có quyền thanh toán khoản này.', 403)
      if (settlement.status !== 'PENDING') return apiError('Khoản này đã được xử lý.', 400)
      amount = Number(settlement.totalPayable)
      orderInfo = `Thanh toan dau gia ${settlement.id.slice(0, 8)}`
      referenceType = 'auction_settlement'
    } else {
      const order = await prisma.bfjOrder.findUnique({
        where: { id: body.referenceId },
        select: { id: true, customerId: true, depositAmount: true, depositPaid: true, status: true, orderNumber: true },
      })
      if (!order) return apiError('Không tìm thấy đơn hàng.', 404)
      if (order.customerId !== userId) return apiError('Bạn không có quyền thanh toán đơn này.', 403)
      if (order.depositPaid) return apiError('Đơn này đã thanh toán cọc.', 400)
      if (!order.depositAmount || Number(order.depositAmount) <= 0) return apiError('Đơn chưa có số tiền cọc.', 400)
      if (order.status !== 'AWAITING_DEPOSIT') return apiError('Đơn chưa sẵn sàng thanh toán cọc.', 400)
      amount = Number(order.depositAmount)
      orderInfo = `Dat coc don ${order.orderNumber}`
      referenceType = 'bfj_order'
    }

    if (amount < 1000) return apiError('Số tiền thanh toán không hợp lệ.', 400)

    // Mã giao dịch nội bộ (vnp_TxnRef) — duy nhất
    const code = `VNP${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4).toString().padStart(4, '0')}`

    await prisma.paymentIntent.create({
      data: {
        code,
        provider: 'VNPAY',
        purpose: body.purpose,
        userId,
        amount,
        status: 'PENDING',
        referenceType,
        referenceId: body.referenceId,
      },
    })

    const now = new Date()
    const expire = new Date(now.getTime() + 15 * 60 * 1000) // hết hạn sau 15 phút
    const url = buildPaymentUrl(config, {
      amount,
      txnRef: code,
      orderInfo,
      ipAddr: getClientIp(req),
      createDate: vnpDate(now),
      expireDate: vnpDate(expire),
    })

    return apiSuccess({ paymentUrl: url, code })
  } catch (err) {
    return handleApiError(err)
  }
}
