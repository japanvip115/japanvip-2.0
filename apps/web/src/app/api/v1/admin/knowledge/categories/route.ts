import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { slugify, uniqueSlug } from '@/lib/slug'

export async function GET() {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const items = await prisma.knowledgeCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { articles: true } } },
    })
    return apiSuccess({ items })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const input = createSchema.parse(await req.json())
    const slug = await uniqueSlug(slugify(input.slug || input.name), async (s) =>
      !!(await prisma.knowledgeCategory.findUnique({ where: { slug: s } })),
    )
    const item = await prisma.knowledgeCategory.create({
      data: { name: input.name, slug, description: input.description ?? null, sortOrder: input.sortOrder ?? 0 },
    })
    await createAuditLog({ userId: user.id, action: 'knowledge_category.create', resourceType: 'KnowledgeCategory', resourceId: item.id })
    return apiSuccess({ item }, 'Đã tạo danh mục', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
