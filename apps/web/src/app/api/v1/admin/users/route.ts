import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { UserRole, UserStatus } from '@japanvip/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 25
  const skip = (page - 1) * take
  const role = searchParams.get('role') as UserRole | null
  const status = searchParams.get('status') as UserStatus | null
  const q = searchParams.get('q') ?? ''

  const where = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { profile: { fullName: { contains: q, mode: 'insensitive' as const } } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    deletedAt: null,
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          profile: { select: { fullName: true } },
          _count: { select: { bfjOrders: true, bids: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return apiSuccess({ users, total, page, totalPages: Math.ceil(total / take) })
  } catch (err) {
    return handleApiError(err)
  }
}
