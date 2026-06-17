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

// User: request withdrawal — creates PENDING transaction, admin approves
export async function requestWithdrawal(
  userId: string,
  amount: number,
  bankInfo: { bankName: string; accountNumber: string; accountName: string }
): Promise<{ txnNumber: string }> {
  const wallet = await getOrCreateWallet(userId)
  const available = Number(wallet.balance) - Number(wallet.lockedBalance)

  if (amount <= 0) throw new Error('Số tiền rút phải lớn hơn 0')
  if (amount < 100_000) throw new Error('Số tiền rút tối thiểu 100,000₫')
  if (available < amount) {
    throw new Error(
      `Số dư khả dụng không đủ. Có thể rút: ${available.toLocaleString('vi-VN')}₫`
    )
  }

  const txnNumber = `TXN-WD-${uuidv4().slice(0, 8).toUpperCase()}`

  await prisma.transaction.create({
    data: {
      txnNumber,
      walletId: wallet.id,
      userId,
      type: 'WITHDRAWAL',
      amount,
      direction: 'DEBIT',
      balanceBefore: Number(wallet.balance),
      balanceAfter: Number(wallet.balance),
      status: 'PENDING',
      notes: `Yêu cầu rút tiền — ${bankInfo.bankName} ${bankInfo.accountNumber} (${bankInfo.accountName})`,
    },
  })

  return { txnNumber }
}

// Admin: approve withdrawal — deduct balance
export async function approveWithdrawal(txnId: string, adminId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findUnique({ where: { id: txnId } })
    if (!txn || txn.type !== 'WITHDRAWAL' || txn.status !== 'PENDING') {
      throw new Error('Giao dịch không hợp lệ hoặc đã xử lý')
    }

    const wallet = await tx.wallet.findUnique({ where: { id: txn.walletId } })
    if (!wallet) throw new Error('Ví không tồn tại')

    const amount = Number(txn.amount)
    const available = Number(wallet.balance) - Number(wallet.lockedBalance)
    if (available < amount) throw new Error('Số dư không đủ để hoàn tất rút tiền')

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = balanceBefore - amount

    await tx.wallet.update({
      where: { id: txn.walletId },
      data: { balance: { decrement: amount } },
    })

    await tx.transaction.update({
      where: { id: txnId },
      data: {
        status: 'COMPLETED',
        balanceBefore,
        balanceAfter,
        createdBy: adminId,
      },
    })
  })

  const txn = await prisma.transaction.findUnique({ where: { id: txnId }, select: { userId: true } })
  if (txn) await invalidateCache(CacheKey.userWallet(txn.userId))
}

// Admin: reject withdrawal — no balance change, just mark rejected
export async function rejectWithdrawal(txnId: string, adminId: string, reason: string): Promise<void> {
  const txn = await prisma.transaction.findUnique({ where: { id: txnId } })
  if (!txn || txn.type !== 'WITHDRAWAL' || txn.status !== 'PENDING') {
    throw new Error('Giao dịch không hợp lệ hoặc đã xử lý')
  }

  await prisma.transaction.update({
    where: { id: txnId },
    data: {
      status: 'FAILED',
      notes: `${txn.notes ?? ''} | Từ chối: ${reason}`,
      createdBy: adminId,
    },
  })
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
