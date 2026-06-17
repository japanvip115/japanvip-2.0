import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, type UploadFolder } from '@/lib/r2'
import { rateLimit } from '@/lib/rate-limit'

const ALLOWED_FOLDERS: UploadFolder[] = ['products', 'banners', 'blogs', 'brands', 'categories', 'category-icons', 'settings']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const rl = await rateLimit(req, 'admin:upload', session.user!.id)
  if (!rl.allowed) return apiError('Quá nhiều request upload. Thử lại sau.', 429)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null

    if (!file || file.size === 0) return apiError('Không có file được gửi lên', 400)
    if (!folder || !(ALLOWED_FOLDERS as string[]).includes(folder)) {
      return apiError('Folder không hợp lệ', 400)
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError('Chỉ chấp nhận JPG, PNG, WebP, AVIF', 400)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return apiError('File tối đa 10MB', 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadFile(folder as UploadFolder, buffer, file.type, file.name)

    return apiSuccess({ publicUrl })
  } catch (err) {
    return handleApiError(err)
  }
}
