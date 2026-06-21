import { NextRequest } from 'next/server'
import { runDailyMarketing } from '@/lib/marketing-cron.service'

export const maxDuration = 60

// Gửi email marketing theo lịch (win-back hằng ngày, digest thứ 5).
// Bảo vệ bằng CRON_SECRET nếu được cấu hình.
// Hỗ trợ ?force=1 để admin test digest ngoài thứ 5 (vẫn cần CRON_SECRET).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = new URL(req.url).searchParams.get('force') === '1'
  const result = await runDailyMarketing({ force })
  return Response.json({ ok: true, ...result })
}
