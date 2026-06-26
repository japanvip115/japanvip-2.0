import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'

export const dynamic = 'force-dynamic'

// Cron NHẸ — CHỈ publish blog đã lên lịch (status SCHEDULED) đến hạn.
// Gọi thường xuyên (vd mỗi 10 phút) bằng cron ngoài (cron-job.org) để bài lên ĐÚNG GIỜ hẹn.
// KHÔNG chạy email marketing / Facebook (việc đó ở /cron/publish-scheduled, 1 lần/ngày)
// → gọi nhiều lần endpoint này KHÔNG gây gửi trùng.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const { count } = await prisma.blogPost.updateMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    data: { status: 'PUBLISHED', publishedAt: now },
  })

  return Response.json({ published: count, at: now.toISOString() })
}
