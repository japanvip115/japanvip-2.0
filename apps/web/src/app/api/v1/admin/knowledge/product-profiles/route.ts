import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const productId = req.nextUrl.searchParams.get('productId')
    if (productId) {
      const profile = await prisma.productKnowledgeProfile.findUnique({ where: { productId } })
      return apiSuccess({ profile })
    }
    const profiles = await prisma.productKnowledgeProfile.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, productId: true, confidenceScore: true, riskFlags: true, lastVerifiedAt: true, updatedAt: true },
    })
    return apiSuccess({ profiles })
  } catch (err) {
    return handleApiError(err)
  }
}

const putSchema = z.object({
  productId: z.string().uuid(),
  originalLanguage: z.string().max(10).optional(),
  originalSourceText: z.string().max(8000).optional().nullable(),
  translatedSummary: z.string().max(8000).optional().nullable(),
  verifiedFacts: z.array(z.string().max(500)).max(50).optional(),
  missingFields: z.array(z.string().max(500)).max(50).optional(),
  riskFlags: z.array(z.string().max(500)).max(50).optional(),
  buyerGuidance: z.string().max(4000).optional().nullable(),
  voltageGuidance: z.string().max(4000).optional().nullable(),
  transformerGuidance: z.string().max(4000).optional().nullable(),
  modelComparisonNotes: z.string().max(4000).optional().nullable(),
  internalNotes: z.string().max(4000).optional().nullable(),
  confidenceScore: z.number().int().min(0).max(100).optional().nullable(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  if (!user || !hasRole(user.role, 'EDITOR')) return apiError('Unauthorized', 401)
  try {
    const input = putSchema.parse(await req.json())
    const { productId, ...fields } = input
    const now = new Date()

    const data = {
      originalLanguage: fields.originalLanguage ?? undefined,
      originalSourceText: fields.originalSourceText ?? undefined,
      translatedSummary: fields.translatedSummary ?? undefined,
      verifiedFacts: fields.verifiedFacts ?? undefined,
      missingFields: fields.missingFields ?? undefined,
      riskFlags: fields.riskFlags ?? undefined,
      buyerGuidance: fields.buyerGuidance ?? undefined,
      voltageGuidance: fields.voltageGuidance ?? undefined,
      transformerGuidance: fields.transformerGuidance ?? undefined,
      modelComparisonNotes: fields.modelComparisonNotes ?? undefined,
      internalNotes: fields.internalNotes ?? undefined,
      confidenceScore: fields.confidenceScore ?? undefined,
      lastVerifiedAt: now,
      updatedBy: user.id,
    }

    const profile = await prisma.productKnowledgeProfile.upsert({
      where: { productId },
      create: {
        productId,
        originalLanguage: fields.originalLanguage ?? 'ja',
        originalSourceText: fields.originalSourceText ?? null,
        translatedSummary: fields.translatedSummary ?? null,
        verifiedFacts: fields.verifiedFacts ?? [],
        missingFields: fields.missingFields ?? [],
        riskFlags: fields.riskFlags ?? [],
        buyerGuidance: fields.buyerGuidance ?? null,
        voltageGuidance: fields.voltageGuidance ?? null,
        transformerGuidance: fields.transformerGuidance ?? null,
        modelComparisonNotes: fields.modelComparisonNotes ?? null,
        internalNotes: fields.internalNotes ?? null,
        confidenceScore: fields.confidenceScore ?? null,
        lastVerifiedAt: now,
        updatedBy: user.id,
      },
      update: data,
    })
    await createAuditLog({ userId: user.id, action: 'product_profile.save', resourceType: 'ProductKnowledgeProfile', resourceId: profile.id })
    return apiSuccess({ profile }, 'Đã lưu hồ sơ tri thức')
  } catch (err) {
    return handleApiError(err)
  }
}
