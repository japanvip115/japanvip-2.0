import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { QuickOrderStatus } from '@japanvip/db'

const STATUSES: QuickOrderStatus[] = ['PENDING', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

const updateSchema = z.object({
  status: z.enum(STATUSES as [QuickOrderStatus, ...QuickOrderStatus[]]).optional(),
  adminNotes: z.string().max(2000).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user || !hasRole(session.user.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    const body = updateSchema.parse(await req.json())

    const order = await prisma.quickOrder.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.adminNotes !== undefined && { adminNotes: body.adminNotes }),
      },
    })

    return apiSuccess(order, 'Cập nhật thành công')
  } catch (err) {
    return handleApiError(err)
  }
}
