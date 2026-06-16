import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const body = await req.json()
  const { amount, paymentRef, proofUrl, notes } = body as {
    amount: number
    paymentRef: string
    proofUrl?: string
    notes?: string
  }

  if (!amount || amount < 100_000) return NextResponse.json({ error: 'Số tiền tối thiểu 100,000₫' }, { status: 400 })
  if (!paymentRef?.trim()) return NextResponse.json({ error: 'Vui lòng nhập mã giao dịch' }, { status: 400 })

  // Check duplicate paymentRef
  const existing = await prisma.transaction.findFirst({
    where: { paymentRef: paymentRef.trim(), type: 'DEPOSIT' },
  })
  if (existing) return NextResponse.json({ error: 'Mã giao dịch này đã được gửi trước đó' }, { status: 409 })

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId, balance: 0, lockedBalance: 0, currency: 'VND' },
    update: {},
  })

  const txnNumber = `DEP-${uuidv4().slice(0, 8).toUpperCase()}`
  const txn = await prisma.transaction.create({
    data: {
      txnNumber,
      walletId: wallet.id,
      userId,
      type: 'DEPOSIT',
      amount,
      direction: 'CREDIT',
      balanceBefore: Number(wallet.balance),
      balanceAfter: Number(wallet.balance),
      paymentRef: paymentRef.trim(),
      paymentMethod: 'BANK_TRANSFER',
      status: 'PENDING',
      // Store proof URL in notes field (reuse existing schema without migration)
      notes: proofUrl ? `proof:${proofUrl}${notes ? `|${notes}` : ''}` : (notes ?? 'Chờ xác nhận'),
    },
  })

  return NextResponse.json({ success: true, txnNumber: txn.txnNumber })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deposits = await prisma.transaction.findMany({
    where: { userId: session.user.id, type: 'DEPOSIT' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({ deposits })
}
