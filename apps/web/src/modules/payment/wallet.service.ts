import { prisma } from '@japanvip/db'
import type { TransactionType } from '@japanvip/db'
import { v4 as uuidv4 } from 'uuid'
import { invalidateCache, CacheKey } from '@/lib/redis'

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } })
  if (existing) return existing

  return prisma.wallet.create({
    data: { userId, balance: 0, lockedBalance: 0, currency: 'VND' },
  })
}

export async function getWalletBalance(userId: string) {
  const wallet = await getOrCreateWallet(userId)
  return {
    balance: Number(wallet.balance),
    lockedBalance: Number(wallet.lockedBalance),
    available: Number(wallet.balance) - Number(wallet.lockedBalance),
  }
}

// Lock balance when placing a bid — runs inside a Prisma transaction
export async function lockBidAmount(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  amount: number,
  auctionId: string
): Promise<void> {
  const wallet = await tx.wallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error('Ví không tồn tại')

  const available = Number(wallet.balance) - Number(wallet.lockedBalance)
  if (available < amount) {
    throw new Error(
      `Số dư không đủ. Cần ${amount.toLocaleString('vi-VN')}₫, hiện có ${available.toLocaleString('vi-VN')}₫`
    )
  }

  await tx.wallet.update({
    where: { userId },
    data: { lockedBalance: { increment: amount } },
  })

  const txnNumber = `TXN-HOLD-${uuidv4().slice(0, 8).toUpperCase()}`
  await tx.transaction.create({
    data: {
      txnNumber,
      walletId: wallet.id,
      userId,
      type: 'AUCTION_HOLD',
      amount,
      direction: 'DEBIT',
      balanceBefore: Number(wallet.balance),
      balanceAfter: Number(wallet.balance),
      referenceType: 'auction',
      referenceId: auctionId,
      status: 'COMPLETED',
      notes: `Hold đặt cọc cho phiên đấu giá`,
    },
  })
}

// Release locked balance when outbid
export async function releaseBidLock(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  amount: number,
  auctionId: string
): Promise<void> {
  const wallet = await tx.wallet.findUnique({ where: { userId } })
  if (!wallet) return

  await tx.wallet.update({
    where: { userId },
    data: { lockedBalance: { decrement: amount } },
  })

  const txnNumber = `TXN-REL-${uuidv4().slice(0, 8).toUpperCase()}`
  await tx.transaction.create({
    data: {
      txnNumber,
      walletId: wallet.id,
      userId,
      type: 'AUCTION_RELEASE',
      amount,
      direction: 'CREDIT',
      balanceBefore: Number(wallet.balance),
      balanceAfter: Number(wallet.balance),
      referenceType: 'auction',
      referenceId: auctionId,
      status: 'COMPLETED',
      notes: `Giải phóng hold khi bị outbid`,
    },
  })
}

// Deduct balance on settlement (winner pays)
export async function settleAuctionPayment(
  userId: string,
  amount: number,
  auctionId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Ví không tồn tại')

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = balanceBefore - amount

    if (balanceAfter < 0) throw new Error('Số dư không đủ để thanh toán')

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        lockedBalance: { decrement: amount }, // Release the hold too
      },
    })

    const txnNumber = `TXN-SETTLE-${uuidv4().slice(0, 8).toUpperCase()}`
    await tx.transaction.create({
      data: {
        txnNumber,
        walletId: wallet.id,
        userId,
        type: 'AUCTION_SETTLE',
        amount,
        direction: 'DEBIT',
        balanceBefore,
        balanceAfter,
        referenceType: 'auction',
        referenceId: auctionId,
        status: 'COMPLETED',
        notes: `Thanh toán phiên đấu giá`,
      },
    })
  })

  await invalidateCache(CacheKey.userWallet(userId))
}

// Admin: manual deposit to wallet
export async function adminDepositWallet(
  userId: string,
  amount: number,
  paymentRef: string,
  adminId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(userId)
    const balanceBefore = Number(wallet.balance)
    const balanceAfter = balanceBefore + amount

    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    })

    const txnNumber = `TXN-DEP-${uuidv4().slice(0, 8).toUpperCase()}`
    await tx.transaction.create({
      data: {
        txnNumber,
        walletId: wallet.id,
        userId,
        type: 'DEPOSIT',
        amount,
        direction: 'CREDIT',
        balanceBefore,
        balanceAfter,
        paymentRef,
        status: 'COMPLETED',
        createdBy: adminId,
        notes: `Nạp tiền vào ví`,
      },
    })
  })

  await invalidateCache(CacheKey.userWallet(userId))
}
