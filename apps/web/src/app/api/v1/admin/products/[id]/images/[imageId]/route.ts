import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string; imageId: string }> }

const patchSchema = z.object({
  isPrimary: z.boolean().optional(),
  altText: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id: productId, imageId } = await params

  try {
    const body = patchSchema.parse(await req.json())

    if (body.isPrimary) {
      await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
    }

    const image = await prisma.productImage.update({
      where: { id: imageId, productId },
      data: body,
    })

    return apiSuccess(image)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id: productId, imageId } = await params

  try {
    await prisma.productImage.delete({ where: { id: imageId, productId } })
    return apiSuccess(null)
  } catch (err) {
    return handleApiError(err)
  }
}
