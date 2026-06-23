import { prisma } from '@japanvip/db'
import { publishPost } from './facebook.service'
import { getFacebookConfig } from './facebook-config'

/** Đăng 1 bài (đăng ngay hoặc từ cron) + cập nhật trạng thái. */
export async function publishOnePost(postId: string): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const post = await prisma.facebookPost.findUnique({ where: { id: postId } })
  if (!post) return { ok: false, error: 'Không tìm thấy bài đăng' }
  if (post.status === 'PUBLISHED') return { ok: false, error: 'Bài đã được đăng' }

  const res = await publishPost({
    message: post.message,
    imageUrl: post.imageUrl ?? undefined,
    link: post.linkUrl ?? undefined,
  })

  if (res.ok) {
    await prisma.facebookPost.update({
      where: { id: postId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), fbPostId: res.postId, errorMessage: null },
    })
    return { ok: true, postId: res.postId }
  }
  await prisma.facebookPost.update({
    where: { id: postId },
    data: { status: 'FAILED', errorMessage: res.error },
  })
  return { ok: false, error: res.error }
}

/** Đăng các bài SCHEDULED đến hạn. Bỏ qua nếu chương trình tắt / chưa cấu hình. */
export async function publishDueFacebookPosts(limit = 5): Promise<{ processed: number; published: number; failed: number }> {
  const cfg = await getFacebookConfig()
  if (!cfg || !cfg.enabled) return { processed: 0, published: 0, failed: 0 }

  const due = await prisma.facebookPost.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  })

  let published = 0
  let failed = 0
  for (const post of due) {
    const r = await publishOnePost(post.id)
    if (r.ok) published++
    else failed++
  }
  return { processed: due.length, published, failed }
}
