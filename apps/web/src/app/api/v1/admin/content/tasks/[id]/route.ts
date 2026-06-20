import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const task = await prisma.contentTask.findUnique({ where: { id } })
    if (!task) return apiError('Không tìm thấy task', 404)
    if (task.status === 'RUNNING') return apiError('Task đang chạy, không thể xóa', 400)
    await prisma.contentTask.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)
  const { id } = await params
  try {
    const body = await req.json()
    const task = await prisma.contentTask.update({
      where: { id },
      data: {
        ...(body.scheduledAt && { scheduledAt: new Date(body.scheduledAt) }),
        ...(body.title && { title: body.title }),
        ...(body.status === 'PENDING' && { status: 'PENDING', errorMessage: null }),
      },
    })
    return apiSuccess(task)
  } catch (err) {
    return handleApiError(err)
  }
}
