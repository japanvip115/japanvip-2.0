import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@japanvip/db'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? ''
  const expected = process.env.CRON_SECRET ?? ''
  if (!expected || !safeEqual(secret, expected)) {
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
