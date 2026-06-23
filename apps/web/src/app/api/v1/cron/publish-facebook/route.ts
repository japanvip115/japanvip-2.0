import { NextRequest } from 'next/server'
import { publishDueFacebookPosts } from '@/lib/social/facebook-publish'

export const maxDuration = 60

// Đăng các bài Facebook SCHEDULED đến hạn.
// Vercel Hobby chỉ cho 1 cron/ngày (đã dùng cho publish-scheduled, đã gọi kèm hàm này),
// nên endpoint này dành cho cron NGOÀI (vd cron-job.org) nếu muốn đăng đúng giờ hơn.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await publishDueFacebookPosts(10)
  return Response.json({ ok: true, ...result })
}
