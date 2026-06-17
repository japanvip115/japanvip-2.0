import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const flag = await prisma.fraudFlag.findUnique({ where: { id } })
    if (!flag) return apiError('Không tìm thấy', 404)
    if (flag.resolved) return apiError('Đã được xử lý rồi', 400)

    const updated = await prisma.fraudFlag.update({
      where: { id },
      data: { resolved: true, resolvedBy: session.user!.id },
    })
    return apiSuccess(updated, 'Đã đánh dấu xử lý')
  } catch (err) {
    return handleApiError(err)
  }
}
