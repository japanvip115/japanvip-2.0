import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  attributes: z.array(z.object({
    name: z.string().min(1).max(255),
    value: z.string().min(1),
  })).min(1),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id: productId } = await params

  try {
    const body = schema.parse(await req.json())

    const created = await prisma.$transaction(
      body.attributes.map((a) =>
        prisma.productAttribute.create({ data: { productId, name: a.name, value: a.value } })
      )
    )

    return apiSuccess(created, undefined, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
