import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { getVnpayConfig } from '@/lib/payments/vnpay-config'
import { verifySignature } from '@/lib/payments/vnpay'
import { notifyUser } from '@/modules/notification/notification.service'

function ipnResponse(code: string, message: string) {
  return NextResponse.json({ RspCode: code, Message: message })
}

/**
 * VNPay IPN (server-to-server). Nguồn xác nhận thanh toán chính thức.
 * Verify chữ ký, idempotent theo mã giao dịch, cập nhật settlement/order.
 */
export async function GET(req: NextRequest) {
  const query: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((v, k) => { query[k] = v })

  const config = await getVnpayConfig()
  if (!config) return ipnResponse('99', 'Gateway not configured')

  if (!verifySignature(config, query)) return ipnResponse('97', 'Invalid checksum')

  const code = query.vnp_TxnRef
  if (!code) return ipnResponse('01', 'Order not found')

  const intent = await prisma.paymentIntent.findUnique({ where: { code } })
  if (!intent) return ipnResponse('01', 'Order not found')

  // Kiểm tra số tiền (vnp_Amount tính theo đơn vị x100)
  const paidAmount = Number(query.vnp_Amount) / 100
  if (Math.round(paidAmount) !== Math.round(Number(intent.amount))) {
    return ipnResponse('04', 'Invalid amount')
  }

  // Idempotent — đã xử lý rồi
  if (intent.status === 'PAID') return ipnResponse('02', 'Order already confirmed')

  const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00'

  if (!success) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', providerData: query, providerRef: query.vnp_TransactionNo ?? null },
    })
    return ipnResponse('00', 'Confirm Success') // đã ghi nhận kết quả (thất bại)
  }

  const now = new Date()

  // Cập nhật atomic: PaymentIntent + đối tượng tham chiếu
  await prisma.$transaction(async (tx) => {
    // Atomic claim — chỉ chuyển PENDING → PAID một lần
    const claim = await tx.paymentIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: { status: 'PAID', providerRef: query.vnp_TransactionNo ?? null, providerData: query, paidAt: now },
    })
    if (claim.count === 0) return // request khác đã xử lý

    if (intent.purpose === 'AUCTION_SETTLEMENT') {
      await tx.auctionSettlement.updateMany({
        where: { id: intent.referenceId, status: 'PENDING' },
        data: { status: 'PAID', paidAt: now },
      })
    } else if (intent.purpose === 'BFJ_DEPOSIT') {
      await tx.bfjOrder.updateMany({
        where: { id: intent.referenceId, depositPaid: false },
        data: { depositPaid: true, status: 'DEPOSIT_RECEIVED' },
      })
    }
  })

  notifyUser({
    userId: intent.userId,
    type: intent.purpose === 'AUCTION_SETTLEMENT' ? 'payment_settlement' : 'payment_deposit',
    title: 'Thanh toán thành công',
    body: `Japan VIP đã nhận thanh toán ${Number(intent.amount).toLocaleString('vi-VN')}₫.`,
    data: { code, referenceType: intent.referenceType, referenceId: intent.referenceId },
    channel: 'IN_APP',
  }).catch(() => {})

  return ipnResponse('00', 'Confirm Success')
}
