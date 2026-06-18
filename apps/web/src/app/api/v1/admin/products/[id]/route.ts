import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  ownerType: z.enum(['JAPANVIP', 'PARTNER']).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED']).optional(),
  badge: z.enum(['NEW_ARRIVAL', 'SOLD_OUT', 'ORDER_ONLY']).nullable().optional(),
  originUrl: z.string().url().nullable().optional(),
  salePrice: z.number().positive().nullable().optional(),
  marketPrice: z.number().positive().nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().min(0).optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDesc: z.string().nullable().optional(),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })).max(100).optional(),
  gifts: z.array(z.object({ name: z.string(), price: z.number().optional(), image: z.string().optional() })).max(20).optional(),
})


export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        attributes: { orderBy: { name: 'asc' } },
        _count: { select: { auctions: true } },
      },
    })
    if (!product) return apiError('Không tìm thấy sản phẩm', 404)
    return apiSuccess(product)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const body = patchSchema.parse(await req.json())

    if (body.slug) {
      const conflict = await prisma.product.findFirst({
        where: { slug: body.slug, NOT: { id } },
        select: { id: true },
      })
      if (conflict) return apiError('Slug đã tồn tại', 409)
    }

    const data: Prisma.ProductUpdateInput = {}
    if (body.name !== undefined) data.name = body.name
    if (body.slug !== undefined) data.slug = body.slug
    if (body.description !== undefined) data.description = body.description
    if (body.ownerType !== undefined) data.ownerType = body.ownerType as Prisma.EnumProductOwnerTypeFilter['equals']
    if (body.condition !== undefined) data.condition = body.condition as Prisma.EnumProductConditionFilter['equals']
    if (body.status !== undefined) data.status = body.status as Prisma.EnumProductStatusFilter['equals']
    if (body.badge !== undefined) data.badge = body.badge
    if (body.originUrl !== undefined) data.originUrl = body.originUrl
    if (body.salePrice !== undefined) data.salePrice = body.salePrice !== null ? new Prisma.Decimal(body.salePrice) : null
    if (body.marketPrice !== undefined) data.marketPrice = body.marketPrice !== null ? new Prisma.Decimal(body.marketPrice) : null
    if (body.rating !== undefined) data.rating = body.rating !== null ? new Prisma.Decimal(body.rating) : null
    if (body.reviewCount !== undefined) data.reviewCount = body.reviewCount
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle
    if (body.metaDesc !== undefined) data.metaDesc = body.metaDesc
    if (body.gifts !== undefined) data.gifts = body.gifts
    if (body.categoryId !== undefined) data.category = body.categoryId ? { connect: { id: body.categoryId } } : { disconnect: true }
    if (body.brandId !== undefined) data.brand = body.brandId ? { connect: { id: body.brandId } } : { disconnect: true }

    const product = await prisma.product.update({
      where: { id },
      data,
      select: { id: true, name: true, slug: true, status: true },
    })

    if (body.specifications && body.specifications.length > 0) {
      await prisma.productAttribute.deleteMany({ where: { productId: id } })
      await prisma.productAttribute.createMany({
        data: body.specifications.map((s) => ({
          productId: id,
          name: s.label,
          value: s.value,
        })),
      })
    }

    return apiSuccess(product)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } })
    if (!product) return apiError('Không tìm thấy sản phẩm', 404)

    const hasAuctions = await prisma.auction.count({ where: { productId: id } })
    if (hasAuctions > 0) return apiError('Không thể xoá sản phẩm đang có phiên đấu giá', 422)

    await prisma.product.delete({ where: { id } })
    return apiSuccess(null, 'Đã xoá sản phẩm')
  } catch (err) {
    return handleApiError(err)
  }
}
