/**
 * Facebook Graph API — đăng bài lên Fanpage Japan VIP.
 * Dùng Page Access Token (admin trang tự tạo). Đăng lên CHÍNH page của mình
 * nên không cần Meta App Review cho người dùng khác.
 */
import { getFacebookConfig } from './facebook-config'

const GRAPH = 'https://graph.facebook.com/v21.0'

export type PublishResult = { ok: true; postId: string } | { ok: false; error: string }

/** Kiểm tra token + page: trả tên page nếu hợp lệ. */
export async function testFacebookConnection(): Promise<{ ok: boolean; pageName?: string; error?: string }> {
  const cfg = await getFacebookConfig()
  if (!cfg) return { ok: false, error: 'Chưa cấu hình Page ID hoặc Access Token.' }
  try {
    const url = `${GRAPH}/${cfg.pageId}?fields=name,id&access_token=${encodeURIComponent(cfg.accessToken)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi Graph API' }
    return { ok: true, pageName: data.name }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không gọi được Graph API' }
  }
}

/** Đăng bài chữ (kèm link tùy chọn) lên page. */
export async function publishTextPost(message: string, link?: string): Promise<PublishResult> {
  const cfg = await getFacebookConfig()
  if (!cfg) return { ok: false, error: 'Chưa cấu hình Facebook.' }
  try {
    const body = new URLSearchParams({ message, access_token: cfg.accessToken })
    if (link) body.set('link', link)
    const res = await fetch(`${GRAPH}/${cfg.pageId}/feed`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi đăng bài' }
    return { ok: true, postId: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đăng được bài' }
  }
}

/** Đăng bài kèm ảnh (Facebook tải ảnh từ URL). */
export async function publishPhotoPost(message: string, imageUrl: string): Promise<PublishResult> {
  const cfg = await getFacebookConfig()
  if (!cfg) return { ok: false, error: 'Chưa cấu hình Facebook.' }
  try {
    const body = new URLSearchParams({ url: imageUrl, caption: message, access_token: cfg.accessToken })
    const res = await fetch(`${GRAPH}/${cfg.pageId}/photos`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(25000),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi đăng ảnh' }
    // photos endpoint trả post_id (id của bài), fallback id
    return { ok: true, postId: data.post_id ?? data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đăng được ảnh' }
  }
}

/** Đăng album nhiều ảnh: upload từng ảnh (published=false) → /feed với attached_media. */
export async function publishAlbumPost(message: string, imageUrls: string[]): Promise<PublishResult> {
  const cfg = await getFacebookConfig()
  if (!cfg) return { ok: false, error: 'Chưa cấu hình Facebook.' }
  try {
    const mediaIds: string[] = []
    for (const url of imageUrls.slice(0, 10)) {
      const body = new URLSearchParams({ url, published: 'false', access_token: cfg.accessToken })
      const res = await fetch(`${GRAPH}/${cfg.pageId}/photos`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(25000),
      })
      const data = await res.json()
      if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi tải ảnh album' }
      if (data.id) mediaIds.push(data.id)
    }
    if (mediaIds.length === 0) return { ok: false, error: 'Không tải được ảnh nào' }

    const feedBody = new URLSearchParams({ message, access_token: cfg.accessToken })
    mediaIds.forEach((id, i) => feedBody.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })))
    const res = await fetch(`${GRAPH}/${cfg.pageId}/feed`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: feedBody,
      signal: AbortSignal.timeout(25000),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi đăng album' }
    return { ok: true, postId: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đăng được album' }
  }
}

/** Đăng bài: nhiều ảnh → album, 1 ảnh → /photos, không ảnh → /feed. */
export async function publishPost(opts: { message: string; imageUrl?: string; imageUrls?: string[]; link?: string }): Promise<PublishResult> {
  const imgs = (opts.imageUrls ?? []).filter(Boolean)
  if (imgs.length > 1) return publishAlbumPost(opts.message, imgs)
  const single = imgs[0] ?? opts.imageUrl
  if (single) return publishPhotoPost(opts.message, single)
  return publishTextPost(opts.message, opts.link)
}

/** Thêm comment vào 1 bài (dùng cho first-comment chèn link → tăng reach). */
export async function addComment(fbPostId: string, message: string): Promise<PublishResult> {
  const cfg = await getFacebookConfig()
  if (!cfg) return { ok: false, error: 'Chưa cấu hình Facebook.' }
  try {
    const body = new URLSearchParams({ message, access_token: cfg.accessToken })
    const res = await fetch(`${GRAPH}/${fbPostId}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    if (data.error) return { ok: false, error: data.error.message ?? 'Lỗi đăng comment' }
    return { ok: true, postId: data.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đăng được comment' }
  }
}

export type PostEngagement = { reactions: number; comments: number; shares: number }

/** Đọc tương tác 1 bài (reaction/comment/share). Cần pages_read_engagement. null nếu lỗi. */
export async function getPostEngagement(fbPostId: string): Promise<PostEngagement | null> {
  const cfg = await getFacebookConfig()
  if (!cfg) return null
  try {
    const fields = 'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares'
    const url = `${GRAPH}/${fbPostId}?fields=${fields}&access_token=${encodeURIComponent(cfg.accessToken)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const d = await res.json()
    if (d.error) return null
    return {
      reactions: d.reactions?.summary?.total_count ?? 0,
      comments: d.comments?.summary?.total_count ?? 0,
      shares: d.shares?.count ?? 0,
    }
  } catch {
    return null
  }
}
