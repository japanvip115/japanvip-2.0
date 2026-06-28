import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile, ALLOWED_MIME_TYPES } from '@/lib/r2'
import { rateLimit } from '@/lib/rate-limit'

const PROOF_MAX_BYTES = 10 * 1024 * 1024 // 10MB — ảnh chứng từ chuyển khoản

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  const rl = await rateLimit(req, 'upload:proof', session.user!.id)
  if (!rl.allowed) return apiError('Quá nhiều lần tải lên. Vui lòng thử lại sau.', 429)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) return apiError('Không có file được gửi lên', 400)
    // Chứng từ chỉ nhận ẢNH (không nhận video) + tối đa 10MB → chống lạm dụng dung lượng.
    if (!file.type.startsWith('image/') || !ALLOWED_MIME_TYPES.includes(file.type)) return apiError('Chỉ chấp nhận ảnh JPG, PNG, WebP', 400)
    if (file.size > PROOF_MAX_BYTES) return apiError('Ảnh tối đa 10MB', 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFile('deposits', buffer, file.type, file.name)
    return apiSuccess({ url }, 'Upload thành công')
  } catch (err) {
    return handleApiError(err)
  }
}
