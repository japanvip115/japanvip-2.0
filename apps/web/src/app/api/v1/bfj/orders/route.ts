import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createBfjOrder, getBfjOrdersByCustomer } from '@/modules/bfj/services/bfj-order.service'
import { detectPlatform } from '@/modules/bfj/url-parser/parser.factory'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

const itemSchema = z.object({
  sourceUrl: z.string().url(),
  productName: z.string().optional().nullable(),
  productImage: z.string().optional().nullable(),
  unitPriceJpy: z.number().positive().optional().nullable(),
  quantity: z.number().int().min(1).max(50),
  variation: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const createSchema = z.object({
  addressId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional(),
  items: z.array(itemSchema).min(1).max(20),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  try {
    const body = createSchema.parse(await req.json())

    const order = await createBfjOrder({
      customerId: session.user!.id,
      addressId: body.addressId,
      notes: body.notes,
      items: body.items.map((item) => ({
        sourceUrl: item.sourceUrl,
        productName: item.productName ?? undefined,
        productImage: item.productImage ?? undefined,
        unitPriceJpy: item.unitPriceJpy ?? undefined,
        quantity: item.quantity,
        variation: item.variation ?? undefined,
        notes: item.notes ?? undefined,
        platform: detectPlatform(item.sourceUrl),
      })),
    })

    return apiSuccess(order, 'Đơn hàng đã được tạo thành công', 201)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10'))

  try {
    const result = await getBfjOrdersByCustomer(session.user!.id, page, limit)
    return apiSuccess(result)
  } catch (err) {
    return handleApiError(err)
  }
}
