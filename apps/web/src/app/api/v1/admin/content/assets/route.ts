import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { resolveEditorAuth } from '@/lib/api-auth'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

const CHANNELS = [
  'FACEBOOK', 'ZALO', 'TIKTOK_CAPTION', 'TIKTOK_SCRIPT', 'YOUTUBE_SHORTS',
  'YOUTUBE_OUTLINE', 'EMAIL', 'PUSH', 'BANNER', 'META_AD', 'CHATBOT',
] as const

const STATUSES = [
  'DRAFT', 'AI_GENERATED', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'APPROVED',
  'SCHEDULED', 'PUBLISHED', 'REJECTED', 'ARCHIVED',
] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)

  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const take = Math.min(50, Math.max(1, Number(sp.get('take') ?? '20')))
    const channel = sp.get('channel')
    const status = sp.get('status')
    const productId = sp.get('productId')
    const q = sp.get('q')?.trim()

    const where: Prisma.ContentAssetWhereInput = {}
    if (channel && CHANNELS.includes(channel as (typeof CHANNELS)[number])) {
      where.channel = channel as (typeof CHANNELS)[number]
    }
    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
      where.status = status as (typeof STATUSES)[number]
    }
    if (productId) where.sourceProductId = productId
    if (q) where.title = { contains: q, mode: 'insensitive' }

    const [items, total] = await Promise.all([
      prisma.contentAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      prisma.contentAsset.count({ where }),
    ])

    return apiSuccess({ items, total, page, take, totalPages: Math.ceil(total / take) })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(500),
  channel: z.enum(CHANNELS),
  body: z.string().min(1),
  status: z.enum(['DRAFT', 'AI_GENERATED', 'PENDING_REVIEW']).optional(),
  provider: z.string().max(50).optional(),
  sourceProductId: z.string().uuid().optional(),
  sourceTopic: z.string().max(1000).optional(),
  goal: z.string().max(50).optional(),
  audience: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  // Cho phép session EDITOR/ADMIN (như cũ) HOẶC Bearer API key content (để Content Team ghi nháp)
  if (!(await resolveEditorAuth(req))) return apiError('Unauthorized', 401)

  try {
    const input = createSchema.parse(await req.json())
    // createdBy: ưu tiên user trong session; nếu xác thực bằng API key thì fallback admin đầu tiên
    const session = await auth()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = (session?.user as any)?.id as string | undefined
    const createdBy = sessionUserId ?? (await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }))?.id
    if (!createdBy) return apiError('Thiếu người tạo', 400)

    const asset = await prisma.contentAsset.create({
      data: {
        title: input.title,
        channel: input.channel,
        body: input.body,
        status: input.status ?? 'DRAFT',
        provider: input.provider ?? 'manual',
        sourceProductId: input.sourceProductId ?? null,
        sourceTopic: input.sourceTopic ?? null,
        goal: input.goal ?? null,
        audience: input.audience ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        createdBy,
      },
    })
    await createAuditLog({
      userId: createdBy,
      action: 'content_asset.create',
      resourceType: 'ContentAsset',
      resourceId: asset.id,
      newValues: { channel: asset.channel, status: asset.status },
    })
    return apiSuccess({ asset }, 'Đã lưu nội dung', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
