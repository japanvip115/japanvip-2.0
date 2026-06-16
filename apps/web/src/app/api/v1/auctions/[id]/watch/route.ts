import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  const userId = session.user!.id

  const rl = await rateLimit(req, 'auction:watch', userId)
  if (!rl.allowed) return apiError('Quá nhiều thao tác, thử lại sau.', 429)

  const { id } = await params

  try {
    await prisma.auctionWatchlist.upsert({
      where: { userId_auctionId: { userId, auctionId: id } },
      create: { userId, auctionId: id },
      update: {},
    })
    return apiSuccess(null, 'Đã thêm vào danh sách theo dõi')
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  const userId = session.user!.id

  const rl = await rateLimit(req, 'auction:watch', userId)
  if (!rl.allowed) return apiError('Quá nhiều thao tác, thử lại sau.', 429)

  const { id } = await params

  try {
    await prisma.auctionWatchlist.deleteMany({
      where: { userId: session.user!.id, auctionId: id },
    })
    return apiSuccess(null, 'Đã xoá khỏi danh sách theo dõi')
  } catch (err) {
    return handleApiError(err)
  }
}
