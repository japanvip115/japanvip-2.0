import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  role: z.enum(['CUSTOMER', 'PARTNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFY']).optional(),
  emailVerified: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        wallet: { select: { balance: true, lockedBalance: true, currency: true } },
        _count: { select: { bfjOrders: true, bids: true, notifications: true } },
      },
    })
    if (!user) return apiError('Không tìm thấy người dùng', 404)

    const { passwordHash: _, ...safeUser } = user
    return apiSuccess(safeUser)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  // Prevent downgrading a SUPER_ADMIN
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return apiError('Không tìm thấy người dùng', 404)
  if (target.role === 'SUPER_ADMIN') return apiError('Không thể chỉnh sửa Super Admin', 403)

  try {
    const body = patchSchema.parse(await req.json())
    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, role: true, status: true },
    })
    return apiSuccess(user)
  } catch (err) {
    return handleApiError(err)
  }
}
