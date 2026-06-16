import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { z } from 'zod'
import { invalidateCache, CacheKey } from '@/lib/redis'

type Params = { params: Promise<{ txnId: string }> }

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(300).optional(),
})

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole((session.user as any).role, 'ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { txnId } = await params
  const body = await req.json()
  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { action, rejectReason } = parsed.data
  const adminId = session.user.id as string

  const txn = await prisma.transaction.findUnique({
    where: { id: txnId },
    include: { wallet: true },
  })

  if (!txn) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 })
  if (txn.type !== 'DEPOSIT') return NextResponse.json({ error: 'Không phải giao dịch nạp tiền' }, { status: 400 })
  if (txn.status !== 'PENDING') return NextResponse.json({ error: 'Giao dịch đã được xử lý' }, { status: 409 })

  if (action === 'approve') {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: txn.walletId } })
      if (!wallet) throw new Error('Ví không tồn tại')

      const balanceBefore = Number(wallet.balance)
      const balanceAfter = balanceBefore + Number(txn.amount)

      await tx.wallet.update({
        where: { id: txn.walletId },
        data: { balance: { increment: Number(txn.amount) } },
      })

      await tx.transaction.update({
        where: { id: txnId },
        data: {
          status: 'COMPLETED',
          balanceBefore,
          balanceAfter,
          createdBy: adminId,
          notes: `Đã duyệt bởi admin`,
        },
      })
    })

    await invalidateCache(CacheKey.userWallet(txn.userId))
    return NextResponse.json({ success: true, action: 'approved' })
  }

  // reject
  await prisma.transaction.update({
    where: { id: txnId },
    data: {
      status: 'FAILED',
      createdBy: adminId,
      notes: rejectReason ? `Từ chối: ${rejectReason}` : 'Yêu cầu bị từ chối',
    },
  })

  return NextResponse.json({ success: true, action: 'rejected' })
}
