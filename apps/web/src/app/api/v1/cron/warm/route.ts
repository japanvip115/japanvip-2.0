import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'

// Ping sẵn trang chủ + các trang list + danh mục chính → giữ cache (unstable_cache 120s)
// và Neon luôn ẤM. Gọi định kỳ ~90s từ cron NGOÀI (cron-job.org) để khách lúc nào cũng vào nhanh.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cats = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    select: { id: true },
  })

  const urls = [
    '/',
    '/san-pham',
    '/dau-gia',
    ...cats.map((c) => `/san-pham?categoryId=${c.id}`),
  ]

  const results = await Promise.allSettled(
    urls.map((u) => fetch(`${BASE}${u}`, { headers: { 'x-warm': '1' }, cache: 'no-store' })),
  )
  const warmed = results.filter((r) => r.status === 'fulfilled').length
  return Response.json({ ok: true, warmed, total: urls.length })
}
