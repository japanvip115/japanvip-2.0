import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveEditorAuth } from '@/lib/api-auth'
import { prisma, Prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// StudioGoal → FacebookPost.angle
function angleFromGoal(goal?: string | null): 'product' | 'promo' | 'tips' {
  if (goal === 'sales' || goal === 'new_arrival' || goal === 'remarketing') return 'promo'
  if (goal === 'education' || goal === 'seo') return 'tips'
  return 'product'
}

// Cầu nối Content Studio → Facebook Marketing.
// Tạo NHÁP FacebookPost từ 1 content_asset đã DUYỆT (kênh FACEBOOK). KHÔNG tự đăng lên fanpage —
// việc đăng vẫn là hành động riêng của con người trong công cụ Facebook Marketing.
export async function POST(req: NextRequest, { params }: Params) {
  if (!(await resolveEditorAuth(req))) return apiError('Unauthorized', 401)
  const { id } = await params

  try {
    const asset = await prisma.contentAsset.findUnique({ where: { id } })
    if (!asset) return apiError('Không tìm thấy nội dung', 404)
    if (asset.channel !== 'FACEBOOK') return apiError('Chỉ áp dụng cho nội dung Facebook', 400)
    if (asset.status !== 'APPROVED') return apiError('Chỉ đăng được nội dung đã duyệt (APPROVED)', 400)

    const meta = (asset.metadata ?? {}) as Record<string, unknown>
    if (typeof meta.facebookPostId === 'string') {
      return apiError('Đã tạo nháp bài fanpage cho nội dung này rồi', 409)
    }
    const slug = typeof meta.sourceBlogSlug === 'string' ? meta.sourceBlogSlug : null
    const linkUrl = slug ? `https://japanvip.vn/blog/${slug}` : null
    const imageUrls = Array.isArray(meta.imageUrls)
      ? (meta.imageUrls as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 10)
      : []

    const session = await auth()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = (session?.user as any)?.id as string | undefined
    const createdBy = sessionUserId ?? (await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }))?.id
    if (!createdBy) return apiError('Thiếu người tạo', 400)

    const post = await prisma.facebookPost.create({
      data: {
        message: asset.body,
        imageUrls,
        linkUrl,
        angle: angleFromGoal(asset.goal),
        status: 'DRAFT', // KHÔNG tự đăng — người đăng ở Facebook Marketing
        productId: asset.sourceProductId,
        createdBy,
      },
    })

    // Ghi ngược facebookPostId vào asset để chống tạo trùng + truy vết
    await prisma.contentAsset.update({
      where: { id },
      data: { metadata: { ...meta, facebookPostId: post.id } as Prisma.InputJsonValue },
    })

    await createAuditLog({
      userId: createdBy,
      action: 'content_asset.to_facebook',
      resourceType: 'FacebookPost',
      resourceId: post.id,
      newValues: { fromAsset: id, status: 'DRAFT' },
    })

    return apiSuccess({ facebookPost: post }, 'Đã tạo nháp bài fanpage (chưa đăng)', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
