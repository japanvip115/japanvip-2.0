import { prisma } from '@japanvip/db'

export type LiabilityError = { code: string; message: string }

/**
 * Kiểm tra trần bảo lãnh theo tiền cọc cho một mức giá (bid hoặc max-bid).
 * - Một bid không vượt 20× tổng cọc đã duyệt.
 * - Tổng liability across các phiên LIVE khác + mức giá mới ≤ 10× tổng cọc.
 * Trả về null nếu hợp lệ, hoặc { code, message } nếu vượt trần.
 */
export async function checkBidLiability(
  userId: string,
  auctionId: string,
  amount: number
): Promise<LiabilityError | null> {
  const totalDeposit = await prisma.transaction.aggregate({
    where: { userId, type: 'DEPOSIT', status: 'COMPLETED' },
    _sum: { amount: true },
  })
  const depositSum = Number(totalDeposit._sum.amount ?? 0)
  if (depositSum <= 0) return null

  if (amount > depositSum * 20) {
    return {
      code: 'DEPOSIT_LIMIT',
      message: `Giá đặt vượt quá giới hạn bảo lãnh. Tổng cọc ${depositSum.toLocaleString('vi-VN')}₫ cho phép tối đa ${(depositSum * 20).toLocaleString('vi-VN')}₫.`,
    }
  }

  const topBids = await prisma.$queryRaw<{ auction_id: string; max_amount: bigint }[]>`
    SELECT DISTINCT ON (auction_id) auction_id, amount as max_amount
    FROM bids b
    WHERE bidder_id = ${userId}::uuid
      AND auction_id != ${auctionId}::uuid
      AND EXISTS (
        SELECT 1 FROM auctions a WHERE a.id = b.auction_id AND a.status = 'LIVE'
      )
    ORDER BY auction_id, amount DESC
  `
  const existingLiability = topBids.reduce((sum, r) => sum + Number(r.max_amount), 0)
  if (existingLiability + amount > depositSum * 10) {
    const maxAllowed = depositSum * 10 - existingLiability
    const message = existingLiability === 0
      ? `Giá đặt (${amount.toLocaleString('vi-VN')}₫) vượt quá 10× tiền cọc của bạn (${depositSum.toLocaleString('vi-VN')}₫). Vui lòng nạp thêm tiền đặt cọc để tham gia.`
      : `Bạn đang tham gia ${topBids.length} phiên khác (tổng ${existingLiability.toLocaleString('vi-VN')}₫). Mức giá tối đa bạn có thể đặt thêm là ${maxAllowed > 0 ? maxAllowed.toLocaleString('vi-VN') : 0}₫.`
    return { code: 'CROSS_AUCTION_LIMIT', message }
  }

  return null
}
