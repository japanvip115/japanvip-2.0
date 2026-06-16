import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  url: z.string().min(1),
  altText: z.string().max(255).optional(),
  isPrimary: z.boolean().default(false),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id: productId } = await params

  try {
    const body = schema.parse(await req.json())

    const maxOrder = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1

    if (body.isPrimary) {
      await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } })
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        url: body.url,
        altText: body.altText ?? null,
        isPrimary: body.isPrimary,
        sortOrder,
      },
    })

    return apiSuccess(image, undefined, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
