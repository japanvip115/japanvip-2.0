import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { analyzeProduct } from '@/lib/knowledge/product-analysis'

export const maxDuration = 120

const bodySchema = z.object({
  productId: z.string().uuid(),
  model: z.string().max(50).optional(),
  originalSourceText: z.string().max(8000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)

  try {
    const input = bodySchema.parse(await req.json())
    const p = await prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        name: true, description: true, originUrl: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        attributes: { take: 20, select: { name: true, value: true } },
      },
    })
    if (!p) return apiError('Không tìm thấy sản phẩm', 404)

    const result = await analyzeProduct({
      name: p.name,
      brandName: p.brand?.name,
      categoryName: p.category?.name,
      specs: p.attributes.map((x) => `${x.name.replace(/^\[[^\]]+\]/, '')}: ${x.value}`).join('; ') || undefined,
      description: p.description ?? undefined,
      originUrl: p.originUrl ?? undefined,
      originalSourceText: input.originalSourceText,
    }, input.model)

    if (!result.analysis) return apiError(result.error ?? 'Không phân tích được', 502)

    await createAuditLog({
      userId: user.id, action: 'product.ai_analysis', resourceType: 'Product', resourceId: input.productId,
      newValues: { source: result.source, confidence: result.analysis.confidenceScore },
    })
    return apiSuccess({ analysis: result.analysis, source: result.source })
  } catch (err) {
    return handleApiError(err)
  }
}
