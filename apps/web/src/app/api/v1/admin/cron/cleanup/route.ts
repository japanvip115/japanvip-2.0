import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000)
  const oneDayAgo = new Date(now.getTime() - 86400_000)

  const [deletedOtps] = await Promise.all([
    // OTPs đã dùng (> 7 ngày) hoặc hết hạn (> 1 ngày)
    prisma.bidConfirmOtp.deleteMany({
      where: {
        OR: [
          { used: true, createdAt: { lt: sevenDaysAgo } },
          { expiresAt: { lt: oneDayAgo } },
        ],
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    deleted: { otps: deletedOtps.count },
  })
}
