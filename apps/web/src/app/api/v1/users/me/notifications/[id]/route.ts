import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { markAsRead } from '@/modules/notification/notification.service'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  try {
    const { id } = await params
    await markAsRead(id, session.user!.id)
    return apiSuccess(null)
  } catch (err) {
    return handleApiError(err)
  }
}
