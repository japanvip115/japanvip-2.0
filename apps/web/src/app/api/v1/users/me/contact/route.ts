import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

// Tên + SĐT của khách đang đăng nhập — để pre-fill form địa chỉ (khỏi gõ lại)
export async function GET() {
  const session = await auth()
  if (!session?.user) return apiError('Unauthorized', 401)
  try {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, profile: { select: { fullName: true } } },
    })
    return apiSuccess({
      fullName: u?.profile?.fullName ?? session.user.name ?? '',
      phone: u?.phone ?? '',
    })
  } catch (err) {
    return handleApiError(err)
  }
}
