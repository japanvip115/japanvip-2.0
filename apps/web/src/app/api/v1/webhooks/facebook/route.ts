import { NextRequest } from 'next/server'
import { getAutoReplyConfig, handleCommentEvent } from '@/lib/social/facebook-autoreply'

export const dynamic = 'force-dynamic'

/** Xác thực webhook (Meta gọi GET khi đăng ký). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const mode = sp.get('hub.mode')
  const token = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')

  const cfg = await getAutoReplyConfig()
  if (mode === 'subscribe' && token && cfg.verifyToken && token === cfg.verifyToken) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

type FeedChange = { field?: string; value?: Parameters<typeof handleCommentEvent>[0] }
type Entry = { changes?: FeedChange[] }

/** Nhận sự kiện (comment mới) → auto-reply. Luôn trả 200 để Meta không retry. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { object?: string; entry?: Entry[] }
    if (body.object === 'page' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes ?? []) {
          if (change.field === 'feed' && change.value) {
            await handleCommentEvent(change.value).catch(() => null)
          }
        }
      }
    }
  } catch {
    // nuốt lỗi — vẫn trả 200
  }
  return new Response('EVENT_RECEIVED', { status: 200 })
}
