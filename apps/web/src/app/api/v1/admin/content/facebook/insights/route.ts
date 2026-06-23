import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { getPostEngagement } from '@/lib/social/facebook.service'
import { redisGet, redisSet } from '@/lib/redis'

export const maxDuration = 30

// Cache số liệu mỗi bài 10 phút (tránh gọi Graph API quá nhiều)
const TTL = 600

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAdmin = (s: any) => hasRole(s?.user?.role, 'ADMIN')

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return apiError('Unauthorized', 401)

  try {
    const published = await prisma.facebookPost.findMany({
      where: { status: 'PUBLISHED', fbPostId: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: { id: true, fbPostId: true },
    })

    const results = await Promise.all(
      published.map(async (p) => {
        const cacheKey = `fb:eng:${p.fbPostId}`
        const cached = await redisGet(cacheKey)
        if (cached) return { id: p.id, ...JSON.parse(cached) }
        const eng = await getPostEngagement(p.fbPostId!)
        const data = eng ?? { reactions: 0, comments: 0, shares: 0 }
        if (eng) await redisSet(cacheKey, JSON.stringify(data), TTL)
        return { id: p.id, ...data }
      })
    )

    const totals = results.reduce(
      (a, r) => ({ reactions: a.reactions + r.reactions, comments: a.comments + r.comments, shares: a.shares + r.shares }),
      { reactions: 0, comments: 0, shares: 0 }
    )

    // Map theo postId để UI gắn vào từng bài
    const byPost: Record<string, { reactions: number; comments: number; shares: number }> = {}
    for (const r of results) byPost[r.id] = { reactions: r.reactions, comments: r.comments, shares: r.shares }

    return apiSuccess({
      byPost,
      totals: { ...totals, engagement: totals.reactions + totals.comments + totals.shares, postCount: published.length },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
