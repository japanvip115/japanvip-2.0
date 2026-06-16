import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) return apiError('Không có file được gửi lên', 400)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return apiError('Chỉ chấp nhận JPG, PNG, WebP', 400)
    if (file.size > MAX_UPLOAD_BYTES) return apiError('File tối đa 10MB', 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFile('deposits', buffer, file.type, file.name)
    return apiSuccess({ url }, 'Upload thành công')
  } catch (err) {
    return handleApiError(err)
  }
}
