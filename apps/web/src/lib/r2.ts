import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

export type UploadFolder = 'products' | 'avatars' | 'banners' | 'blogs' | 'brands' | 'categories' | 'category-icons' | 'deposits' | 'settings' | 'logo-templates'

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100MB (video)

function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )
}

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

// ── Server-side upload ────────────────────────────────────────────────────────

export async function uploadFile(
  folder: UploadFolder,
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) throw new Error('Unsupported file type')
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new Error('File too large (max 10MB)')

  const ext = originalName.split('.').pop()?.toLowerCase() ?? contentType.split('/')[1] ?? 'jpg'
  const filename = `${uuidv4()}.${ext}`

  if (isR2Configured()) {
    const key = `${folder}/${filename}`
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )
    return `${process.env.R2_PUBLIC_URL}/${key}`
  }

  // Dev fallback — save to public/uploads/ using require to avoid top-level Node built-in issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePath = require('path') as typeof import('path')
  const dir = nodePath.join(process.cwd(), 'public', 'uploads', folder)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(nodePath.join(dir, filename), buffer)
  return `/uploads/${folder}/${filename}`
}

// ── Presigned URL (production direct-upload, optional) ───────────────────────

export async function generatePresignedUploadUrl(
  folder: UploadFolder,
  contentType: string,
  sizeBytes: number,
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  if (!isR2Configured()) throw new Error('R2 not configured')
  if (!ALLOWED_MIME_TYPES.includes(contentType)) throw new Error('Unsupported file type')
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new Error('File too large (max 10MB)')

  const ext = contentType.split('/')[1]
  const fileKey = `${folder}/${uuidv4()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
    ContentType: contentType,
    ContentLength: sizeBytes,
  })

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 })
  return { uploadUrl, fileKey, publicUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}` }
}

export async function deleteFile(fileKey: string): Promise<void> {
  if (!isR2Configured()) return
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: fileKey }),
  )
}
