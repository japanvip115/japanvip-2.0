/**
 * Fraud Detection Engine — 11 rules, pre-check sync + async scoring.
 * Port từ sonha-imextraco, adapted cho Japan VIP (NextAuth User model).
 */

import { prisma } from '@japanvip/db'
import { isFraudRuleEnabled, writeAuditLog, getFraudSetting } from '@/lib/fraud-settings'

export interface FraudPreCheckInput {
  auctionId: string
  bidderId: string
  amount: number
  ipAddress: string | null
  deviceFingerprint?: string | null
  bidderCreatedAt: Date
  startPrice: number
}

export interface FraudPreCheckResult {
  blocked: boolean
  score: number
  flags: string[]
  triggeredRules: string[]
}

type FraudCheckInput = {
  bidId: string
  auctionId: string
  bidderId: string
  amount: number
  ipAddress: string | null
  deviceFingerprint?: string | null
  bidderCreatedAt: Date
  startPrice: number
}

/**
 * Pre-check ĐỒNG BỘ — chạy trước khi commit bid.
 * Nếu score ≥ FRAUD_SCORE_BLOCK_THRESHOLD → blocked = true.
 */
export async function runFraudPreCheck(input: FraudPreCheckInput): Promise<FraudPreCheckResult> {
  const flags: string[] = []
  const triggeredRules: string[] = []

  try {
    // Rule: SAME_IP_PREBID — cùng IP đã bid từ tài khoản khác trong phiên
    if (input.ipAddress && await isFraudRuleEnabled('SAME_IP_PREBID')) {
      const sameIpBid = await prisma.bid.findFirst({
        where: {
          auctionId: input.auctionId,
          ipAddress: input.ipAddress,
          bidderId: { not: input.bidderId },
        },
        select: { id: true },
      })
      if (sameIpBid) {
        flags.push(`Cùng IP (${input.ipAddress}) đã đặt giá từ tài khoản khác trong phiên`)
        triggeredRules.push('SAME_IP_PREBID')
      }
    }

    // Rule: NEW_ACCOUNT_HIGH_BID — tài khoản mới bid cao bất thường
    if (await isFraudRuleEnabled('NEW_ACCOUNT_HIGH_BID')) {
      const accountAgeMs = Date.now() - input.bidderCreatedAt.getTime()
      if (accountAgeMs < 24 * 60 * 60 * 1000) {
        const bidsBefore = await prisma.bid.count({
          where: { auctionId: input.auctionId, bidderId: input.bidderId },
        })
        if (bidsBefore === 0 && input.amount > input.startPrice * 5) {
          flags.push(
            `Tài khoản mới (<24h) đặt giá cao bất thường: ` +
            `${input.amount.toLocaleString('vi-VN')}₫ (${(input.amount / input.startPrice).toFixed(1)}× giá khởi điểm)`
          )
          triggeredRules.push('NEW_ACCOUNT_HIGH_BID')
        }
      }
    }

    let score = 0
    for (const rule of triggeredRules) {
      const w = parseInt(await getFraudSetting(`FRAUD_WEIGHT_${rule}`), 10)
      if (!Number.isNaN(w)) score += w
    }

    const blockThreshold = parseInt(await getFraudSetting('FRAUD_SCORE_BLOCK_THRESHOLD'), 10) || 60
    return { blocked: score >= blockThreshold, score, flags, triggeredRules }
  } catch {
    return { blocked: false, score: 0, flags: [], triggeredRules: [] }
  }
}

/**
 * runFraudChecks — giữ interface cũ, wrapper cho runFraudPreCheck.
 * Ném Error nếu phát hiện vi phạm cần block ngay.
 */
export async function runFraudChecks(params: {
  bidderId: string
  auctionId: string
  ip: string
}): Promise<void> {
  // Shill-bidding check: đối tác/tạo phiên tự bid vào phiên của mình
  const auction = await prisma.auction.findUnique({
    where: { id: params.auctionId },
    select: { partnerId: true, createdBy: true },
  })
  if (auction && (auction.partnerId === params.bidderId || auction.createdBy === params.bidderId)) {
    throw new Error('Không thể đấu giá trên phiên của chính bạn')
  }
}

/**
 * runFraudCheck ASYNC — chạy SAU khi bid đã lưu vào DB.
 * Không block response. Cộng dồn fraudScore, auto-suspend khi vượt ngưỡng.
 */
export async function runFraudCheck(input: FraudCheckInput): Promise<void> {
  const flags: string[] = []
  const triggeredRules: string[] = []

  try {
    // Rule 1: Cùng IP nhiều tài khoản trong phiên
    if (input.ipAddress && await isFraudRuleEnabled('SAME_IP_MULTI_ACCOUNT')) {
      const sameIpBids = await prisma.bid.findMany({
        where: {
          auctionId: input.auctionId,
          ipAddress: input.ipAddress,
          bidderId: { not: input.bidderId },
          id: { not: input.bidId },
          flagged: false,
        },
        select: { bidderId: true },
        distinct: ['bidderId'],
      })
      if (sameIpBids.length > 0) {
        flags.push(`Cùng IP (${input.ipAddress}) với ${sameIpBids.length} tài khoản khác trong phiên`)
        triggeredRules.push('SAME_IP_MULTI_ACCOUNT')
      }
    }

    // Rule 2: Bid tăng >50% trong 1 giây
    if (await isFraudRuleEnabled('BID_SPIKE')) {
      const prevBid = await prisma.bid.findFirst({
        where: {
          auctionId: input.auctionId,
          id: { not: input.bidId },
          createdAt: { gte: new Date(Date.now() - 1000) },
        },
        orderBy: { createdAt: 'desc' },
        select: { amount: true },
      })
      if (prevBid && Number(prevBid.amount) > 0) {
        const increase = (input.amount - Number(prevBid.amount)) / Number(prevBid.amount)
        if (increase > 0.5) {
          flags.push(
            `Bid tăng đột ngột ${(increase * 100).toFixed(0)}% trong 1 giây ` +
            `(${Number(prevBid.amount).toLocaleString('vi-VN')} → ${input.amount.toLocaleString('vi-VN')}₫)`
          )
          triggeredRules.push('BID_SPIKE')
        }
      }
    }

    // Rule 3: Tài khoản mới bid cao bất thường (async confirmation)
    if (await isFraudRuleEnabled('NEW_ACCOUNT_HIGH_BID')) {
      const accountAgeMs = Date.now() - input.bidderCreatedAt.getTime()
      if (accountAgeMs < 24 * 60 * 60 * 1000) {
        const bidsBefore = await prisma.bid.count({
          where: { auctionId: input.auctionId, bidderId: input.bidderId, id: { not: input.bidId } },
        })
        if (bidsBefore === 0 && input.amount > input.startPrice * 5) {
          flags.push(
            `Tài khoản mới (<24h) đặt giá cao: ${input.amount.toLocaleString('vi-VN')}₫`
          )
          triggeredRules.push('NEW_ACCOUNT_HIGH_BID')
        }
      }
    }

    // Rule 4: Shill bidding — đặt ≥3 lần trong 30 giây
    if (await isFraudRuleEnabled('SHILL_BID')) {
      const rapidCount = await prisma.bid.count({
        where: {
          auctionId: input.auctionId,
          bidderId: input.bidderId,
          id: { not: input.bidId },
          createdAt: { gte: new Date(Date.now() - 30_000) },
        },
      })
      if (rapidCount >= 3) {
        flags.push(`Nghi ngờ shill bidding: đặt ${rapidCount} lần trong 30 giây`)
        triggeredRules.push('SHILL_BID')
      }
    }

    // Rule 5: Cùng device fingerprint nhiều tài khoản
    if (input.deviceFingerprint && await isFraudRuleEnabled('DEVICE_MULTI_ACCOUNT')) {
      const sameDeviceBids = await prisma.bid.findMany({
        where: {
          auctionId: input.auctionId,
          deviceFingerprint: input.deviceFingerprint,
          bidderId: { not: input.bidderId },
          id: { not: input.bidId },
        },
        select: { bidderId: true },
        distinct: ['bidderId'],
      })
      if (sameDeviceBids.length > 0) {
        flags.push(`Cùng thiết bị với ${sameDeviceBids.length} tài khoản khác trong phiên`)
        triggeredRules.push('DEVICE_MULTI_ACCOUNT')
      }
    }

    if (flags.length === 0) return

    // Đánh dấu bid bị flag
    await prisma.bid.update({
      where: { id: input.bidId },
      data: { flagged: true, flagReason: flags.join(' | ') },
    })

    // Ghi FraudFlag (model cũ — backward compat)
    prisma.fraudFlag.create({
      data: {
        userId: input.bidderId,
        type: triggeredRules[0] ?? 'UNKNOWN',
        severity: 'HIGH',
        details: { auctionId: input.auctionId, flags, triggeredRules },
        resolved: false,
      },
    }).catch(() => {})

    writeAuditLog({
      eventType: 'BID_FLAGGED',
      userId: input.bidderId,
      detail: { auctionId: input.auctionId, flags, triggeredRules },
      ipAddress: input.ipAddress,
    }).catch(() => {})

    await applyFraudScore(triggeredRules, input)
  } catch (e) {
    console.error('[FraudCheck] error:', e)
  }
}

async function applyFraudScore(triggeredRules: string[], input: FraudCheckInput): Promise<void> {
  if (triggeredRules.length === 0) return

  let points = 0
  for (const rule of triggeredRules) {
    const w = parseInt(await getFraudSetting(`FRAUD_WEIGHT_${rule}`), 10)
    if (!Number.isNaN(w)) points += w
  }
  if (points <= 0) return

  const threshold = parseInt(await getFraudSetting('FRAUD_SCORE_THRESHOLD'), 10) || 150
  const autoSuspend = (await getFraudSetting('FRAUD_SCORE_SUSPEND')) === 'true'

  const updated = await prisma.user.update({
    where: { id: input.bidderId },
    data: { fraudScore: { increment: points } },
    select: { fraudScore: true, status: true },
  })

  if (updated.fraudScore < threshold) return

  const willSuspend = autoSuspend && updated.status !== 'SUSPENDED'

  writeAuditLog({
    eventType: willSuspend ? 'FRAUD_AUTO_SUSPEND' : 'FRAUD_THRESHOLD_REACHED',
    userId: input.bidderId,
    detail: { fraudScore: updated.fraudScore, threshold, addedPoints: points, rules: triggeredRules },
    ipAddress: input.ipAddress,
  }).catch(() => {})

  if (willSuspend) {
    await prisma.user.update({
      where: { id: input.bidderId },
      data: { status: 'SUSPENDED', sessionVersion: { increment: 1 } },
    })
  }
}
