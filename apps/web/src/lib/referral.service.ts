/**
 * Referral & Loyalty Points — khách thường giới thiệu bạn bè.
 *
 * Luồng:
 *  1. Người mời chia sẻ link ?ref=CODE → người được mời đăng ký → applyReferralCode tạo Referral PENDING
 *  2. Người được mời ĐẶT GIÁ lần đầu → processFirstBidReferral flip PENDING→REWARDED (atomic, idempotent)
 *     → cộng điểm cho cả 2 bên
 *
 * Điểm = voucher giảm giá (KHÔNG phải tiền mặt rút được). 1 điểm = 1₫ giảm trừ.
 */

import { prisma, type PointTransactionType, type Prisma } from '@japanvip/db'
import { getReferralPoints, isReferralEnabled } from './referral-settings'

// Bỏ ký tự dễ nhầm (0/O, 1/I/L) để khách đọc/gõ tay không sai
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length]
  return out
}

/** Lấy (hoặc tạo) mã giới thiệu của user. Idempotent. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
      return code
    } catch (e) {
      // Unique conflict (mã trùng hoặc user đã có mã do race) → thử lại / đọc lại
      const again = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
      if (again?.referralCode) return again.referralCode
    }
  }
  throw new Error('Không tạo được mã giới thiệu, vui lòng thử lại.')
}

/**
 * Gắn quan hệ giới thiệu khi người được mời đăng ký.
 * Trả về true nếu gắn thành công. Bỏ qua âm thầm nếu mã sai / tự giới thiệu / đã được mời.
 */
export async function applyReferralCode(refereeId: string, rawCode: string): Promise<boolean> {
  if (!(await isReferralEnabled())) return false

  const code = rawCode.trim().toUpperCase()
  if (!code || code.length > 20) return false

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })
  if (!referrer) return false
  if (referrer.id === refereeId) return false // không tự giới thiệu

  try {
    await prisma.referral.create({
      data: { referrerId: referrer.id, refereeId, code, status: 'PENDING' },
    })
    return true
  } catch {
    // refereeId unique → đã được giới thiệu trước đó
    return false
  }
}

/** Cộng/trừ điểm + ghi sổ cái, chạy trong transaction. Trả về số dư mới. */
export async function recordPointTxn(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    amount: number // +cộng / -trừ
    type: PointTransactionType
    referenceType?: string
    referenceId?: string
    note?: string
  }
): Promise<number> {
  const user = await tx.user.findUnique({
    where: { id: params.userId },
    select: { pointsBalance: true },
  })
  if (!user) throw new Error('User không tồn tại')

  const before = user.pointsBalance
  const after = before + params.amount
  if (after < 0) throw new Error('Số dư điểm không đủ')

  await tx.user.update({
    where: { id: params.userId },
    data: { pointsBalance: after },
  })

  await tx.pointTransaction.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceBefore: before,
      balanceAfter: after,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      note: params.note ?? null,
    },
  })

  return after
}

/**
 * Gọi sau khi người được mời đặt giá THÀNH CÔNG.
 * Tìm Referral PENDING → flip REWARDED (atomic) → cộng điểm 2 chiều.
 * Idempotent: chỉ bid đầu tiên tìm thấy PENDING mới thưởng; các bid sau no-op.
 * Không throw — lỗi không được chặn luồng đặt giá.
 */
export async function processFirstBidReferral(refereeId: string): Promise<void> {
  try {
    if (!(await isReferralEnabled())) return

    const referral = await prisma.referral.findUnique({
      where: { refereeId },
      select: { id: true, status: true, referrerId: true },
    })
    if (!referral || referral.status !== 'PENDING') return

    const { referrer: referrerPts, referee: refereePts } = await getReferralPoints()

    await prisma.$transaction(async (tx) => {
      // Atomic claim — chỉ 1 request flip được PENDING→REWARDED (chống double-reward khi race)
      const claim = await tx.referral.updateMany({
        where: { id: referral.id, status: 'PENDING' },
        data: {
          status: 'REWARDED',
          qualifiedAt: new Date(),
          referrerPoints: referrerPts,
          refereePoints: refereePts,
        },
      })
      if (claim.count !== 1) return // request khác đã xử lý

      if (referrerPts > 0) {
        await recordPointTxn(tx, {
          userId: referral.referrerId,
          amount: referrerPts,
          type: 'REFERRAL_REFERRER',
          referenceType: 'referral',
          referenceId: referral.id,
          note: 'Thưởng giới thiệu bạn bè tham gia đấu giá',
        })
      }
      if (refereePts > 0) {
        await recordPointTxn(tx, {
          userId: refereeId,
          amount: refereePts,
          type: 'REFERRAL_REFEREE',
          referenceType: 'referral',
          referenceId: referral.id,
          note: 'Điểm chào mừng — tham gia qua lời giới thiệu',
        })
      }
    })
  } catch (err) {
    console.error('[referral] processFirstBidReferral failed:', err)
  }
}
