import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

// Lịch sử giá của 1 SP theo nguồn → dữ liệu vẽ biểu đồ xu hướng.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) return apiError('Thiếu productId', 400)

    const rows = await prisma.competitorPriceHistory.findMany({
      where: { productId },
      orderBy: { observedAt: 'asc' },
      select: { source: true, priceVnd: true, observedAt: true },
      take: 500,
    })

    const bySource: Record<string, Array<{ t: string; price: number }>> = {}
    for (const r of rows) {
      if (r.priceVnd == null) continue
      ;(bySource[r.source] ??= []).push({ t: r.observedAt.toISOString(), price: Number(r.priceVnd) })
    }

    return apiSuccess(Object.entries(bySource).map(([source, points]) => ({ source, points })))
  } catch (err) {
    return handleApiError(err)
  }
}
