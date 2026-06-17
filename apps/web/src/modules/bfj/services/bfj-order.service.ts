import { prisma } from '@japanvip/db'
import type { BfjOrderStatus, BfjSourcePlatform } from '@japanvip/db'
import { getActiveExchangeRate } from './exchange-rate.service'
import { calculateCostEstimate } from './cost-calculator.service'
import { createAuditLog } from '@/lib/audit'
import { notifyUser } from '@/modules/notification/notification.service'
import { sendBfjStatusEmail } from '@/lib/email.service'

export type CreateBfjOrderInput = {
  customerId: string
  addressId?: string | null
  notes?: string
  items: {
    sourceUrl: string
    platform: BfjSourcePlatform
    productName?: string
    productImage?: string
    unitPriceJpy?: number
    quantity: number
    variation?: string
    notes?: string
  }[]
}

// Auto-increment order number via DB sequence trick
async function generateOrderNumber(): Promise<string> {
  const count = await prisma.bfjOrder.count()
  const year = new Date().getFullYear()
  return `BFJ-${year}-${String(count + 1).padStart(6, '0')}`
}

export async function createBfjOrder(input: CreateBfjOrderInput) {
  const rateData = await getActiveExchangeRate()

  // Calculate total estimate from items that have price
  const itemsWithPrice = input.items.filter((i) => i.unitPriceJpy && i.unitPriceJpy > 0)
  let estimatedJpy: number | null = null
  let estimatedVnd: number | null = null
  let depositAmount: number | null = null
  let profitVnd: number | null = null

  if (itemsWithPrice.length > 0) {
    const totalJpy = itemsWithPrice.reduce(
      (sum, i) => sum + (i.unitPriceJpy ?? 0) * i.quantity,
      0
    )
    const estimate = await calculateCostEstimate({
      unitPriceJpy: totalJpy,
      quantity: 1,
    })
    estimatedJpy = totalJpy
    estimatedVnd = estimate.totalEstimateVnd
    depositAmount = estimate.depositAmountVnd
    profitVnd = estimate.profitVnd
  }

  const orderNumber = await generateOrderNumber()

  const order = await prisma.bfjOrder.create({
    data: {
      orderNumber,
      customerId: input.customerId,
      status: 'PENDING_REVIEW',
      exchangeRateId: rateData.id === 'fallback' ? null : rateData.id,
      serviceFeeRate: 0.08,
      estimatedJpy,
      estimatedVnd,
      depositRate: 0.30,
      depositAmount,
      depositPaid: false,
      profitVnd,
      notes: input.notes,
      addressId: input.addressId ?? undefined,
      items: {
        create: input.items.map((item) => ({
          sourcePlatform: item.platform,
          sourceUrl: item.sourceUrl,
          productName: item.productName,
          productImage: item.productImage,
          unitPriceJpy: item.unitPriceJpy,
          quantity: item.quantity,
          variation: item.variation,
          notes: item.notes,
          status: 'PENDING',
        })),
      },
    },
    include: { items: true },
  })

  await createAuditLog({
    userId: input.customerId,
    action: 'bfj_order.create',
    resourceType: 'bfj_order',
    resourceId: order.id,
    newValues: { orderNumber, itemCount: input.items.length },
  })

  await notifyUser({
    userId: input.customerId,
    type: 'bfj_order_created',
    title: `Đơn hàng ${orderNumber} đã được tạo`,
    body: `Đơn mua hộ của bạn đang được xem xét. Chúng tôi sẽ phản hồi trong 24 giờ.`,
    data: { orderId: order.id, orderNumber },
    channel: 'IN_APP',
  })

  return order
}

export async function getBfjOrdersByCustomer(
  customerId: string,
  page = 1,
  limit = 10
) {
  const [orders, total] = await Promise.all([
    prisma.bfjOrder.findMany({
      where: { customerId },
      include: { items: { select: { id: true, productName: true, quantity: true, sourcePlatform: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bfjOrder.count({ where: { customerId } }),
  ])

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getBfjOrderDetail(orderId: string, customerId: string) {
  return prisma.bfjOrder.findFirst({
    where: { id: orderId, customerId },
    include: {
      items: true,
      address: true,
      exchangeRate: true,
    },
  })
}

export async function cancelBfjOrder(orderId: string, customerId: string) {
  const order = await prisma.bfjOrder.findFirst({
    where: { id: orderId, customerId },
    select: { id: true, status: true, orderNumber: true },
  })
  if (!order) throw new Error('Không tìm thấy đơn hàng')

  const cancellable: BfjOrderStatus[] = ['PENDING_REVIEW', 'AWAITING_DEPOSIT']
  if (!cancellable.includes(order.status)) {
    throw new Error('Không thể huỷ đơn hàng ở trạng thái này')
  }

  const updated = await prisma.bfjOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
  })

  await createAuditLog({
    userId: customerId,
    action: 'bfj_order.cancel',
    resourceType: 'bfj_order',
    resourceId: orderId,
    oldValues: { status: order.status },
    newValues: { status: 'CANCELLED' },
  })

  await notifyUser({
    userId: customerId,
    type: 'bfj_order_cancelled',
    title: `Đơn ${order.orderNumber} đã bị huỷ`,
    body: 'Đơn mua hộ của bạn đã được huỷ theo yêu cầu.',
    data: { orderId },
    channel: 'IN_APP',
  })

  return updated
}

// Admin: update order status with notification
export async function adminUpdateOrderStatus(
  orderId: string,
  newStatus: BfjOrderStatus,
  adminId: string,
  adminNotes?: string
) {
  const order = await prisma.bfjOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      customerId: true,
      orderNumber: true,
      trackingVn: true,
      customer: { select: { email: true, profile: { select: { fullName: true } } } },
    },
  })
  if (!order) throw new Error('Không tìm thấy đơn hàng')

  const updated = await prisma.bfjOrder.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(adminNotes ? { adminNotes } : {}),
      ...(newStatus === 'DEPOSIT_RECEIVED' ? { depositPaid: true } : {}),
    },
  })

  await createAuditLog({
    userId: adminId,
    action: 'bfj_order.status_update',
    resourceType: 'bfj_order',
    resourceId: orderId,
    oldValues: { status: order.status },
    newValues: { status: newStatus, adminNotes },
  })

  const statusMessages: Partial<Record<BfjOrderStatus, string>> = {
    AWAITING_DEPOSIT: `Đơn ${order.orderNumber} cần thanh toán đặt cọc`,
    DEPOSIT_RECEIVED: `Đã nhận đặt cọc — đơn ${order.orderNumber} đang được đặt hàng`,
    ORDERED_FROM_JAPAN: `Đơn ${order.orderNumber} đã được đặt tại Nhật Bản`,
    IN_TRANSIT_JP: `Kiện hàng ${order.orderNumber} đang trên đường về kho Nhật`,
    CUSTOMS_CLEARANCE: `Kiện hàng ${order.orderNumber} đang làm thủ tục hải quan`,
    IN_TRANSIT_VN: `Kiện hàng ${order.orderNumber} đang vận chuyển về Việt Nam`,
    DELIVERED: `Đơn ${order.orderNumber} đã được giao thành công`,
  }

  const message = statusMessages[newStatus]
  if (message) {
    await notifyUser({
      userId: order.customerId,
      type: `bfj_order_${newStatus.toLowerCase()}`,
      title: message,
      body: adminNotes ?? message,
      data: { orderId, status: newStatus },
      channel: 'IN_APP',
    })
  }

  // Send email notification (fire-and-forget, do not block status update)
  const customerEmail = order.customer?.email
  const fullName = order.customer?.profile?.fullName ?? 'Khách hàng'
  if (customerEmail) {
    sendBfjStatusEmail({
      email: customerEmail,
      fullName,
      orderNumber: order.orderNumber,
      orderId,
      status: newStatus,
      adminNotes,
      trackingVn: order.trackingVn,
    }).catch((err) => console.error('[BFJ Email]', err))
  }

  return updated
}

export async function adminListBfjOrders(params: {
  page?: number
  limit?: number
  status?: BfjOrderStatus
  search?: string
}) {
  const { page = 1, limit = 20, status, search } = params

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' as const } },
            { customer: { email: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.bfjOrder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, email: true, profile: { select: { fullName: true } } },
        },
        items: { select: { id: true, sourcePlatform: true, productName: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bfjOrder.count({ where }),
  ])

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
}
