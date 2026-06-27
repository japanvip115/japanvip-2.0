import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { findRelevantKnowledge } from '@/lib/claude-code-stream'
import { getDbKnowledge } from '@/lib/content-studio/knowledge-db'
import { generateForChannels } from '@/lib/content-studio/generate'
import { isChannelKey, defaultAssetTitle, type ChannelKey, type StudioContext } from '@/lib/content-studio/channels'

export const maxDuration = 120

const bodySchema = z.object({
  productId: z.string().uuid().optional(),
  topic: z.string().max(1000).optional(),
  channels: z.array(z.string()).min(1, 'Chọn ít nhất 1 kênh').max(11),
  goal: z.enum(['seo', 'sales', 'new_arrival', 'education', 'remarketing']).optional(),
  audience: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  cta: z.string().max(300).optional(),
  keywordPrimary: z.string().max(200).optional(),
  keywordsSecondary: z.string().max(500).optional(),
  voltageNote: z.string().max(300).optional(),
  model: z.string().max(50).optional(),
  save: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)

  try {
    const input = bodySchema.parse(await req.json())

    const channels = input.channels.filter(isChannelKey) as ChannelKey[]
    if (!channels.length) return apiError('Kênh không hợp lệ', 422)
    if (!input.productId && !input.topic?.trim()) {
      return apiError('Cần chọn sản phẩm hoặc nhập chủ đề', 422)
    }

    const ctx: StudioContext = {
      topic: input.topic?.trim() || undefined,
      goal: input.goal,
      audience: input.audience?.trim() || undefined,
      tone: input.tone?.trim() || undefined,
      length: input.length,
      cta: input.cta?.trim() || undefined,
      keywordPrimary: input.keywordPrimary?.trim() || undefined,
      keywordsSecondary: input.keywordsSecondary?.trim() || undefined,
      voltageNote: input.voltageNote?.trim() || undefined,
    }

    if (input.productId) {
      const p = await prisma.product.findUnique({
        where: { id: input.productId },
        select: {
          name: true,
          salePrice: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          attributes: { take: 12, select: { name: true, value: true } },
        },
      })
      if (!p) return apiError('Không tìm thấy sản phẩm', 404)
      ctx.productName = p.name
      ctx.brandName = p.brand?.name
      ctx.categoryName = p.category?.name
      ctx.price = p.salePrice ? `${Number(p.salePrice).toLocaleString('vi-VN')}₫` : undefined
      ctx.specs = p.attributes
        .map((x) => `${x.name.replace(/^\[[^\]]+\]/, '')}: ${x.value}`)
        .join('; ') || undefined
    }

    // Tri thức nền: KB-DB (đã duyệt) + KB-JSON tĩnh — gộp lại nạp vào prompt.
    const kbQuery = [ctx.productName, ctx.categoryName, ctx.topic].filter(Boolean).join(' ')
    const [dbKnowledge, jsonKnowledge] = await Promise.all([
      getDbKnowledge(kbQuery),
      Promise.resolve(ctx.productName ? findRelevantKnowledge(ctx.productName) : ''),
    ])
    ctx.knowledge = [dbKnowledge, jsonKnowledge].filter(Boolean).join('\n') || undefined

    const results = await generateForChannels(channels, ctx, input.model)
    const ok = results.filter((r) => !r.error && r.body)

    let saved: { id: string; channel: string }[] = []
    if (input.save && ok.length) {
      saved = await prisma.$transaction(
        ok.map((r) =>
          prisma.contentAsset.create({
            data: {
              title: defaultAssetTitle(r.channel, ctx),
              channel: r.channel,
              body: r.body,
              provider: r.source,
              status: 'AI_GENERATED',
              sourceProductId: input.productId ?? null,
              sourceTopic: ctx.topic ?? null,
              goal: input.goal ?? null,
              audience: ctx.audience ?? null,
              metadata: { keywordPrimary: ctx.keywordPrimary, tone: ctx.tone } as Prisma.InputJsonValue,
              createdBy: user.id,
            },
            select: { id: true, channel: true },
          }),
        ),
      )
      await createAuditLog({
        userId: user.id,
        action: 'content_studio.generate',
        resourceType: 'ContentAsset',
        newValues: { channels, productId: input.productId, saved: saved.length },
      })
    }

    return apiSuccess({ results, saved })
  } catch (err) {
    return handleApiError(err)
  }
}
