import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getUserNotifications,
  markAllAsRead,
  getUnreadCount,
} from '@/modules/notification/notification.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))

  try {
    const [result, unreadCount] = await Promise.all([
      getUserNotifications(session.user!.id, page, limit),
      getUnreadCount(session.user!.id),
    ])
    return apiSuccess({ ...result, unreadCount })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  try {
    await markAllAsRead(session.user!.id)
    return apiSuccess(null, 'Đã đánh dấu tất cả là đã đọc')
  } catch (err) {
    return handleApiError(err)
  }
}
