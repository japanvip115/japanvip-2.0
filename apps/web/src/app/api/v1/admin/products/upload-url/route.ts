import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) return apiError('Không có file được gửi lên', 400)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError('Chỉ chấp nhận JPG, PNG, WebP, AVIF', 400)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError('File tối đa 10MB', 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadFile('products', buffer, file.type, file.name)

    return apiSuccess({ publicUrl })
  } catch (err) {
    return handleApiError(err)
  }
}
