import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const patchSchema = z.object({
  name: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    const body = patchSchema.parse(await req.json())
    const sub = await prisma.subscriber.update({ where: { id: Number(id) }, data: body })
    return apiSuccess(sub, 'Đã cập nhật')
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    await prisma.subscriber.delete({ where: { id: Number(id) } })
    return apiSuccess(null, 'Đã xóa')
  } catch (err) {
    return handleApiError(err)
  }
}
