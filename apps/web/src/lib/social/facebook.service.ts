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

/** Đăng bài: có ảnh → /photos, không thì /feed. */
export async function publishPost(opts: { message: string; imageUrl?: string; link?: string }): Promise<PublishResult> {
  if (opts.imageUrl) return publishPhotoPost(opts.message, opts.imageUrl)
  return publishTextPost(opts.message, opts.link)
}
