import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string; attrId: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  value: z.string().min(1).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'EDITOR')) return apiError('Forbidden', 403)

  const { id: productId, attrId } = await params

  try {
    const body = patchSchema.parse(await req.json())
    const attr = await prisma.productAttribute.update({
      where: { id: attrId, productId },
      data: body,
    })
    return apiSuccess(attr)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'EDITOR')) return apiError('Forbidden', 403)

  const { id: productId, attrId } = await params

  try {
    await prisma.productAttribute.delete({ where: { id: attrId, productId } })
    return apiSuccess(null)
  } catch (err) {
    return handleApiError(err)
  }
}
