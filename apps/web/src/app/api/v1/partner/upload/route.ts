import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/r2'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

const IMAGE_TYPES = ALLOWED_MIME_TYPES.filter((t) => t.startsWith('image/'))

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Unauthorized', 401)

  const partner = await prisma.partnerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } })
  if (!partner) return apiError('Bạn chưa phải là cộng tác viên', 403)

  const rl = await rateLimit(req, 'partner:upload', session.user.id)
  if (!rl.allowed) return apiError('Quá nhiều request upload. Thử lại sau.', 429)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) return apiError('Không có file được gửi lên', 400)
    if (!IMAGE_TYPES.includes(file.type)) return apiError('Chỉ chấp nhận ảnh JPG, PNG, WebP', 400)
    if (file.size > MAX_UPLOAD_BYTES) return apiError('File quá lớn', 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadFile('partner-docs', buffer, file.type, file.name)

    return apiSuccess({ publicUrl })
  } catch (err) {
    return handleApiError(err)
  }
}
