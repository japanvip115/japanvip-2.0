import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { adminListBfjOrders } from '@/modules/bfj/services/bfj-order.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { BfjOrderStatus } from '@japanvip/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const status = searchParams.get('status') as BfjOrderStatus | null
  const search = searchParams.get('search') ?? undefined

  try {
    const result = await adminListBfjOrders({ page, limit, status: status ?? undefined, search })
    return apiSuccess(result)
  } catch (err) {
    return handleApiError(err)
  }
}
