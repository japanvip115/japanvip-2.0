import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { endAuction } from '@/modules/auction/services/bid.service'

async function handler(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // Manual POST sends x-cron-secret header
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  const cronSecretEnv = process.env.CRON_SECRET

  const isVercelCron = cronSecretEnv && authHeader === `Bearer ${cronSecretEnv}`
  const isManual = cronSecretEnv && cronSecret === cronSecretEnv
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all LIVE auctions whose effective end time has passed
  const expiredAuctions = await prisma.auction.findMany({
    where: {
      status: 'LIVE',
      OR: [
        { extendedEnd: { lt: now }, NOT: { extendedEnd: null } },
        { extendedEnd: null, endsAt: { lt: now } },
      ],
    },
    select: { id: true, endsAt: true, extendedEnd: true },
  })

  const results = await Promise.allSettled(
    expiredAuctions.map((a) => endAuction(a.id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    success: true,
    processed: expiredAuctions.length,
    succeeded,
    failed,
    timestamp: now.toISOString(),
  })
}

export const GET = handler
export const POST = handler
