import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getWalletBalance } from '@/modules/payment/wallet.service'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  try {
    const [balance, transactions] = await Promise.all([
      getWalletBalance(session.user!.id),
      prisma.transaction.findMany({
        where: { userId: session.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          txnNumber: true,
          type: true,
          amount: true,
          direction: true,
          status: true,
          createdAt: true,
          notes: true,
        },
      }),
    ])
    return apiSuccess({ ...balance, transactions })
  } catch (err) {
    return handleApiError(err)
  }
}
