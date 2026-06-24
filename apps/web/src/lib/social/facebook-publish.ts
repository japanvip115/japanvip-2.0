import { prisma } from '@japanvip/db'
import { publishPost, addComment } from './facebook.service'
import { getFacebookConfig } from './facebook-config'
import { withUtm } from './utm'

const DEFAULT_CTA = '👉 Xem chi tiết & đặt hàng tại đây:'

/** Đăng 1 bài (đăng ngay hoặc từ cron) + cập nhật trạng thái. */
export async function publishOnePost(postId: string): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const post = await prisma.facebookPost.findUnique({ where: { id: postId } })
  if (!post) return { ok: false, error: 'Không tìm thấy bài đăng' }
  if (post.status === 'PUBLISHED') return { ok: false, error: 'Bài đã được đăng' }

  // Link KHÔNG để trong thân bài (FB bóp reach bài có link ngoài) → đưa vào comment đầu.
  const res = await publishPost({
    message: post.message,
    imageUrl: post.imageUrl ?? undefined,
  })

  if (res.ok) {
    // First comment: chèn link (đã gắn UTM để đo trên GA4).
    if (post.linkUrl) {
      const utmLink = withUtm(post.linkUrl, { campaign: post.angle, content: `fb_${post.id.slice(0, 8)}` })
      const cta = post.firstComment?.trim() || DEFAULT_CTA
      await addComment(res.postId, `${cta}\n${utmLink}`).catch(() => null)
    }
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
