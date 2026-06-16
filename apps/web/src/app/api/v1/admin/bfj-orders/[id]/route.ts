import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { adminUpdateOrderStatus } from '@/modules/bfj/services/bfj-order.service'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { BfjOrderStatus } from '@japanvip/db'

const BFJ_STATUSES: BfjOrderStatus[] = [
  'PENDING_REVIEW', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED', 'ORDERING',
  'ORDERED_FROM_JAPAN', 'IN_TRANSIT_JP', 'CUSTOMS_CLEARANCE',
  'IN_TRANSIT_VN', 'DELIVERED', 'CANCELLED', 'REFUNDED',
]

const updateSchema = z.object({
  status: z.enum(BFJ_STATUSES as [BfjOrderStatus, ...BfjOrderStatus[]]).optional(),
  adminNotes: z.string().max(2000).optional(),
  trackingJp: z.string().max(255).optional(),
  trackingVn: z.string().max(255).optional(),
  estimatedVnd: z.number().positive().optional(),
  depositAmount: z.number().positive().optional(),
  finalJpy: z.number().positive().optional(),
  finalVnd: z.number().positive().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const order = await prisma.bfjOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { fullName: true } },
          },
        },
        items: true,
        address: true,
        exchangeRate: true,
      },
    })
    if (!order) return apiError('Không tìm thấy đơn hàng', 404)
    return apiSuccess(order)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const body = updateSchema.parse(await req.json())

    // Update tracking / pricing fields directly
    const directFields: Record<string, unknown> = {}
    if (body.trackingJp !== undefined) directFields.trackingJp = body.trackingJp
    if (body.trackingVn !== undefined) directFields.trackingVn = body.trackingVn
    if (body.estimatedVnd !== undefined) directFields.estimatedVnd = body.estimatedVnd
    if (body.depositAmount !== undefined) directFields.depositAmount = body.depositAmount
    if (body.finalJpy !== undefined) directFields.finalJpy = body.finalJpy
    if (body.finalVnd !== undefined) directFields.finalVnd = body.finalVnd
    if (body.adminNotes !== undefined) directFields.adminNotes = body.adminNotes

    if (Object.keys(directFields).length > 0) {
      await prisma.bfjOrder.update({ where: { id }, data: directFields })
    }

    // Status update triggers notification
    if (body.status) {
      await adminUpdateOrderStatus(id, body.status, session.user!.id, body.adminNotes)
    }

    const updated = await prisma.bfjOrder.findUnique({ where: { id } })
    return apiSuccess(updated, 'Cập nhật thành công')
  } catch (err) {
    return handleApiError(err)
  }
}
