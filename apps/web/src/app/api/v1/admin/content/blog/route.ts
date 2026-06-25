import { resolveEditorAuth } from '@/lib/api-auth'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { mirrorContentImages, findRelatedProducts, appendProductBacklinks, MatchedProduct } from '@/lib/blog-scraper'

const schema = z.object({
  authorId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1),
  thumbnailUrl: z.string().min(1).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  categoryId: z.string().uuid().optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
})

async function guard(req: NextRequest) {
  if (!await resolveEditorAuth(req)) return apiError('Unauthorized', 401)
  return null
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 2
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

export async function GET(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const posts = await prisma.blogPost.findMany({
      select: { id: true, slug: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(posts)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  const err = await guard(req)
  if (err) return err

  try {
    const body = await req.json()
    const { relatedProductIds, ...rest } = body
    const data = schema.parse(rest)
    const session = await auth()
    const sessionUserId = (session?.user as any)?.id
    const fallbackAdmin = sessionUserId ? null : await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    const authorId = data.authorId ?? sessionUserId ?? fallbackAdmin?.id
    if (!authorId) return apiError('Thiếu tác giả', 400)
    const slug = await uniqueSlug(data.slug)

    // Use admin-selected products if provided, otherwise auto-match
    let relatedProducts: MatchedProduct[]
    if (Array.isArray(relatedProductIds) && relatedProductIds.length > 0) {
      relatedProducts = await prisma.product.findMany({
        where: { id: { in: relatedProductIds }, status: 'ACTIVE' },
        select: {
          id: true, name: true, slug: true, salePrice: true, marketPrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      })
    } else if (!Array.isArray(relatedProductIds)) {
      relatedProducts = await findRelatedProducts(data.title)
    } else {
      relatedProducts = []
    }
    const contentWithLinks = appendProductBacklinks(data.content, relatedProducts)

    // Mirror external images to R2
    const mirrored = await mirrorContentImages(contentWithLinks, data.thumbnailUrl ?? '')
    const finalContent = mirrored.content
    const finalThumb = mirrored.thumbnailUrl || data.thumbnailUrl || null

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        authorId,
        slug,
        content: finalContent,
        thumbnailUrl: finalThumb,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    })
    return apiSuccess(post, undefined, 201)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  const err = await guard(req)
  if (err) return err
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) return apiError('ids required', 400)
    const { count } = await prisma.blogPost.deleteMany({ where: { id: { in: ids } } })
    return apiSuccess({ count })
  } catch (e) {
    return handleApiError(e)
  }
}
