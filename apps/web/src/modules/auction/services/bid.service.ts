import { prisma } from '@japanvip/db'
import { CacheKey, redisGet, redisSetNX, invalidateCache } from '@/lib/redis'
import { lockBidAmount, releaseBidLock } from '@/modules/payment/wallet.service'
import { runFraudChecks } from './fraud.service'
import { notifyUser } from '@/modules/notification/notification.service'
import { invalidateAuctionCache } from './auction.service'
import { sendBidConfirmationEmail, sendAuctionOutbidEmail, sendAuctionWinEmail } from '@/lib/email.service'
import type { AuctionEvent } from '@japanvip/types'

export type PlaceBidInput = {
  auctionId: string
  bidderId: string
  amount: number
  ip: string
  userAgent?: string
  skipWalletLock?: boolean
  isAutoBid?: boolean
}

export type BidResult = {
  bid: { id: string; amount: number }
  auction: { currentPrice: number; bidCount: number; endsAt: string; extended: boolean }
}

/**
 * Acquire a Redis-based distributed lock for an auction.
 * Returns the lock value (UUID) if acquired, null if already locked.
 * TTL = 3s — enough for a transaction to complete.
 */
async function acquireAuctionLock(auctionId: string): Promise<string | null> {
  const lockKey = `auction:lock:${auctionId}`
  const lockValue = crypto.randomUUID()
  const acquired = await redisSetNX(lockKey, lockValue, 3000)
  return acquired ? lockValue : null
}

async function releaseAuctionLock(auctionId: string, lockValue: string): Promise<void> {
  const lockKey = `auction:lock:${auctionId}`
  const current = await redisGet(lockKey)
  if (current === lockValue) await invalidateCache(lockKey)
}

export async function placeBid(input: PlaceBidInput): Promise<BidResult> {
  // Fraud checks (non-DB, fast) — blocks on CRITICAL (shill bid)
  await runFraudChecks({
    bidderId: input.bidderId,
    auctionId: input.auctionId,
    ip: input.ip,
  })

  // Distributed lock — prevents concurrent bids from racing
  const lockValue = await acquireAuctionLock(input.auctionId)
  if (!lockValue) {
    throw new Error('BID_LOCKED: Phiên đang được xử lý, vui lòng thử lại ngay.')
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock auction row for update — second layer of protection inside the lock
        const auction = await tx.$queryRaw<
          Array<{
            id: string
            status: string
            current_price: string
            min_increment: string
            bid_count: number
            ends_at: Date
            extended_end: Date | null
            auto_extend: boolean
            extend_minutes: number
            extend_trigger: number
            extension_count: number
            max_extensions: number
            winner_id: string | null
            buy_now_price: string | null
          }>
        >`SELECT id, status, current_price, min_increment, bid_count, ends_at,
                 extended_end, auto_extend, extend_minutes, extend_trigger,
                 extension_count, max_extensions, winner_id, buy_now_price
          FROM auctions WHERE id = ${input.auctionId}::uuid FOR UPDATE`

        const auc = auction[0]
        if (!auc) throw new Error('Phiên đấu giá không tồn tại')
        if (auc.status !== 'LIVE') throw new Error('Phiên đấu giá không còn hoạt động')

        const now = new Date()
        const effectiveEnd = auc.extended_end ?? auc.ends_at
        if (now >= effectiveEnd) throw new Error('Phiên đấu giá đã kết thúc')

        const currentPrice = Number(auc.current_price)
        const minIncrement = Number(auc.min_increment)
        const minBid = currentPrice + minIncrement

        if (input.amount < minBid) {
          throw new Error(
            `Giá đặt phải ≥ ${minBid.toLocaleString('vi-VN')}₫ (hiện tại: ${currentPrice.toLocaleString('vi-VN')}₫ + tối thiểu: ${minIncrement.toLocaleString('vi-VN')}₫)`
          )
        }

        // Release previous winning bid's lock
        if (auc.winner_id && auc.winner_id !== input.bidderId) {
          const prevWinningBid = await tx.bid.findFirst({
            where: { auctionId: input.auctionId, status: 'WINNING' },
            select: { bidderId: true, amount: true },
          })
          if (prevWinningBid) {
            if (!input.skipWalletLock) {
              await releaseBidLock(
                tx,
                prevWinningBid.bidderId,
                Number(prevWinningBid.amount),
                input.auctionId
              )
            }
            await tx.bid.updateMany({
              where: { auctionId: input.auctionId, status: 'WINNING' },
              data: { status: 'OUTBID' },
            })
          }
        }

        if (!input.skipWalletLock) {
          await lockBidAmount(tx, input.bidderId, input.amount, input.auctionId)
        }

        const newBid = await tx.bid.create({
          data: {
            auctionId: input.auctionId,
            bidderId: input.bidderId,
            amount: input.amount,
            ipAddress: input.ip,
            userAgent: input.userAgent,
            status: 'WINNING',
            isAutoBid: input.isAutoBid ?? false,
          },
        })

        let newEndTime = effectiveEnd
        let extended = false
        if (auc.auto_extend && auc.extension_count < auc.max_extensions) {
          const minutesLeft = (effectiveEnd.getTime() - now.getTime()) / 60000
          if (minutesLeft <= auc.extend_trigger) {
            newEndTime = new Date(effectiveEnd.getTime() + auc.extend_minutes * 60000)
            extended = true
          }
        }

        await tx.auction.update({
          where: { id: input.auctionId },
          data: {
            currentPrice: input.amount,
            bidCount: { increment: 1 },
            winnerId: input.bidderId,
            winningBidId: newBid.id,
            ...(extended ? { extendedEnd: newEndTime, extensionCount: { increment: 1 } } : {}),
          },
        })

        return {
          bid: { id: newBid.id, amount: input.amount },
          auction: {
            currentPrice: input.amount,
            bidCount: auc.bid_count + 1,
            endsAt: newEndTime.toISOString(),
            extended,
          },
        }
      },
      { timeout: 10000 }
    )

    // Invalidate cache
    await invalidateAuctionCache(input.auctionId)

    // Auto-bid counter — acquire same lock to prevent race with counter
    if (!input.isAutoBid) {
      triggerMaxBidCounter(input.auctionId, input.bidderId, result.auction.currentPrice, input.ip).catch(() => {})
    }

    // Publish SSE event (remove bidderId from public event)
    const event: AuctionEvent = {
      type: result.auction.extended ? 'auction_extended' : 'bid_placed',
      data: result.auction.extended
        ? { newEndTime: result.auction.endsAt }
        : {
            // bidderId intentionally omitted — clients receive isYourBid flag instead
            amount: input.amount,
            newCurrentPrice: result.auction.currentPrice,
            bidCount: result.auction.bidCount,
            newEndTime: result.auction.extended ? result.auction.endsAt : undefined,
            isAutoBid: input.isAutoBid ?? false,
          },
    } as AuctionEvent

    // pub/sub removed — SSE polling picks up state changes via getAuctionState

    const [auctionInfo, bidderInfo] = await Promise.all([
      prisma.auction.findUnique({
        where: { id: input.auctionId },
        select: {
          endsAt: true,
          extendedEnd: true,
          product: { select: { name: true } },
        },
      }).catch(() => null),
      prisma.user.findUnique({
        where: { id: input.bidderId },
        select: { email: true, profile: { select: { fullName: true } } },
      }).catch(() => null),
    ])

    const auctionTitle = auctionInfo?.product?.name ?? 'Phiên đấu giá'
    const endsAt = (auctionInfo?.extendedEnd ?? auctionInfo?.endsAt ?? new Date()).toISOString()

    if (bidderInfo?.email && !input.isAutoBid) {
      sendBidConfirmationEmail({
        email: bidderInfo.email,
        fullName: bidderInfo.profile?.fullName ?? 'Khách hàng',
        auctionTitle,
        auctionId: input.auctionId,
        bidAmount: input.amount,
        currentPrice: result.auction.currentPrice,
        endsAt,
      }).catch(() => {})
    }

    const previousWinner = await prisma.bid
      .findFirst({
        where: { auctionId: input.auctionId, status: 'OUTBID', bidderId: { not: input.bidderId } },
        orderBy: { createdAt: 'desc' },
        select: {
          bidderId: true,
          amount: true,
          bidder: { select: { email: true, profile: { select: { fullName: true } } } },
        },
      })
      .catch(() => null)

    if (previousWinner) {
      notifyUser({
        userId: previousWinner.bidderId,
        type: 'bid_outbid',
        title: 'Bạn vừa bị outbid!',
        body: `Có người vừa đặt giá cao hơn. Đặt lại ngay để không mất phiên đấu giá.`,
        data: { auctionId: input.auctionId, newPrice: input.amount },
        channel: 'IN_APP',
      }).catch(() => {})

      if (previousWinner.bidder?.email) {
        sendAuctionOutbidEmail({
          email: previousWinner.bidder.email,
          fullName: previousWinner.bidder.profile?.fullName ?? 'Khách hàng',
          auctionTitle,
          auctionId: input.auctionId,
          newPrice: input.amount,
          yourBid: Number(previousWinner.amount),
        }).catch(() => {})
      }
    }

    return result
  } finally {
    await releaseAuctionLock(input.auctionId, lockValue)
  }
}

export async function getBidHistory(auctionId: string, limit = 20) {
  return prisma.bid.findMany({
    where: { auctionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bidder: {
        select: {
          id: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  })
}

export async function endAuction(auctionId: string): Promise<void> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      status: true,
      winnerId: true,
      winningBidId: true,
      currentPrice: true,
      reservePrice: true,
      buyerPremium: true,
      commissionRate: true,
      partnerId: true,
      endsAt: true,
      extendedEnd: true,
    },
  })
  if (!auction || auction.status !== 'LIVE') return

  const now = new Date()
  const effectiveEnd = auction.extendedEnd ?? auction.endsAt
  if (now < effectiveEnd) return

  // Atomic guard + settlement trong cùng transaction — chống race condition khi
  // nhiều cron instance chạy song song (chỉ instance đầu tiên đoạt được status).
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.auction.updateMany({
      where: { id: auctionId, status: 'LIVE' },
      data: { status: 'ENDED' },
    })
    if (claim.count === 0) return false // instance khác đã xử lý

    // Kiểm tra giá sàn: nếu chưa đạt → xóa winner, không tạo settlement
    const reserveMet = !auction.reservePrice ||
      Number(auction.currentPrice) >= Number(auction.reservePrice)
    if (!reserveMet && auction.winnerId) {
      await tx.auction.update({
        where: { id: auctionId },
        data: { winnerId: null, winningBidId: null },
      })
    }

    const effectiveWinnerId = reserveMet ? auction.winnerId : null
    if (effectiveWinnerId && auction.currentPrice) {
      const hammerPrice = Number(auction.currentPrice)
      const buyerPremiumAmount = Math.round(hammerPrice * Number(auction.buyerPremium))
      const totalPayable = hammerPrice + buyerPremiumAmount
      const commissionAmount = auction.partnerId
        ? Math.round(hammerPrice * Number(auction.commissionRate))
        : null
      const partnerPayout = commissionAmount ? hammerPrice - commissionAmount : null

      await tx.auctionSettlement.create({
        data: {
          auctionId,
          winnerId: effectiveWinnerId,
          hammerPrice,
          buyerPremiumAmount,
          totalPayable,
          partnerId: auction.partnerId,
          commissionAmount,
          partnerPayout,
          status: 'PENDING',
        },
      })

      const settlementDue = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: 'SETTLED', settlementDue },
      })
    }
    return true
  })

  if (!claimed) return

  // Phần thông báo/email đặt ngoài transaction để không giữ lock DB lâu.
  const reserveMet = !auction.reservePrice ||
    Number(auction.currentPrice) >= Number(auction.reservePrice)
  const effectiveWinnerId = reserveMet ? auction.winnerId : null
  if (effectiveWinnerId && auction.currentPrice) {
    const hammerPrice = Number(auction.currentPrice)
    const buyerPremiumAmount = Math.round(hammerPrice * Number(auction.buyerPremium))
    const totalPayable = hammerPrice + buyerPremiumAmount

    notifyUser({
      userId: effectiveWinnerId,
      type: 'auction_won',
      title: 'Chúc mừng! Bạn đã thắng đấu giá',
      body: `Bạn đã thắng với giá ${hammerPrice.toLocaleString('vi-VN')}₫. Vui lòng thanh toán trong 3 ngày.`,
      data: { auctionId, totalPayable },
      channel: 'IN_APP',
    }).catch(() => {})

    const [winnerInfo, auctionInfo] = await Promise.all([
      prisma.user.findUnique({
        where: { id: effectiveWinnerId },
        select: { email: true, profile: { select: { fullName: true } } },
      }).catch(() => null),
      prisma.auction.findUnique({
        where: { id: auctionId },
        select: { product: { select: { name: true } } },
      }).catch(() => null),
    ])

    if (winnerInfo?.email) {
      sendAuctionWinEmail({
        email: winnerInfo.email,
        fullName: winnerInfo.profile?.fullName ?? 'Khách hàng',
        auctionTitle: auctionInfo?.product?.name ?? 'Phiên đấu giá',
        auctionId,
        hammerPrice,
        buyerPremium: buyerPremiumAmount,
        totalPayable,
        settlementDueDays: 3,
      }).catch(() => {})
    }
  }

  const endEvent: AuctionEvent = {
    type: 'auction_ended',
    data: { winnerId: effectiveWinnerId, winnerAmount: effectiveWinnerId ? Number(auction.currentPrice) : null },
  }
  // pub/sub removed — SSE polling picks up auction_ended via getAuctionState
  await invalidateAuctionCache(auctionId)
}

// Auto-counter competing max bids after a manual bid lands.
// Uses the same auction lock to prevent race conditions.
async function triggerMaxBidCounter(
  auctionId: string,
  currentBidderId: string,
  currentPrice: number,
  ip: string
): Promise<void> {
  // Acquire lock — if busy (another bid in flight), skip this counter cycle
  const lockValue = await acquireAuctionLock(auctionId)
  if (!lockValue) return

  try {
    // Atomically read both max-bid and current auction state
    const [counter, auction] = await Promise.all([
      prisma.auctionMaxBid.findFirst({
        where: { auctionId, bidderId: { not: currentBidderId }, isActive: true },
        orderBy: [{ maxAmount: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.auction.findUnique({
        where: { id: auctionId },
        select: { status: true, currentPrice: true, minIncrement: true, endsAt: true, extendedEnd: true },
      }),
    ])

    if (!counter || !auction || auction.status !== 'LIVE') return

    const now = new Date()
    if (now >= (auction.extendedEnd ?? auction.endsAt)) return

    const latestPrice = Number(auction.currentPrice)
    const minIncrement = Number(auction.minIncrement)
    const neededBid = latestPrice + minIncrement

    if (Number(counter.maxAmount) < neededBid) {
      await prisma.auctionMaxBid.update({
        where: { id: counter.id },
        data: { isActive: false },
      })
      return
    }

    // Release lock before calling placeBid (which will re-acquire it)
    await releaseAuctionLock(auctionId, lockValue)

    await placeBid({
      auctionId,
      bidderId: counter.bidderId,
      amount: neededBid,
      ip,
      skipWalletLock: true,
      isAutoBid: true,
    })
    return // skip finally release (already released above)
  } finally {
    // Only releases if we didn't already release above
    await releaseAuctionLock(auctionId, lockValue)
  }
}
