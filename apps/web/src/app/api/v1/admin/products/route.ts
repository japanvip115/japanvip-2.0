import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import type { ProductStatus, ProductOwnerType, ProductCondition } from '@japanvip/db'

const createSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số, gạch ngang'),
  description: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  ownerType: z.enum(['JAPANVIP', 'PARTNER']).default('JAPANVIP'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).default('NEW'),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED']).default('DRAFT'),
  originUrl: z.string().url().nullable().optional(),
  salePrice: z.number().positive().nullable().optional(),
  marketPrice: z.number().positive().nullable().optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDesc: z.string().nullable().optional(),
  images: z.array(z.string().url()).max(20).optional(),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })).max(100).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 20
  const skip = (page - 1) * take
  const status = searchParams.get('status') as ProductStatus | null
  const q = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''

  const where = {
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? { OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { slug: { contains: q, mode: 'insensitive' as const } },
        ]}
      : {}),
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          _count: { select: { auctions: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return apiSuccess({ products, total, page, totalPages: Math.ceil(total / take) })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = createSchema.parse(await req.json())

    const existing = await prisma.product.findUnique({ where: { slug: body.slug }, select: { id: true } })
    if (existing) return apiError('Slug đã tồn tại, vui lòng chọn slug khác', 409)

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        categoryId: body.categoryId ?? null,
        brandId: body.brandId ?? null,
        ownerType: body.ownerType as ProductOwnerType,
        condition: body.condition as ProductCondition,
        status: body.status as ProductStatus,
        originUrl: body.originUrl ?? null,
        salePrice: body.salePrice != null ? new Prisma.Decimal(body.salePrice) : null,
        marketPrice: body.marketPrice != null ? new Prisma.Decimal(body.marketPrice) : null,
        metaTitle: body.metaTitle ?? null,
        metaDesc: body.metaDesc ?? null,
      },
    })

    if (body.images && body.images.length > 0) {
      await prisma.productImage.createMany({
        data: body.images.map((url, i) => ({
          productId: product.id,
          url,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      })
    }

    if (body.specifications && body.specifications.length > 0) {
      await prisma.productAttribute.createMany({
        data: body.specifications.map((s) => ({
          productId: product.id,
          name: s.label,
          value: s.value,
        })),
      })
    }

    return apiSuccess({ id: product.id }, 'Đã tạo sản phẩm', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
