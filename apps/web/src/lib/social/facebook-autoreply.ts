import { prisma } from '@japanvip/db'
import { getFacebookConfig } from './facebook-config'
import { addComment } from './facebook.service'

export type AutoReplyRule = { keyword: string; reply: string }
export type AutoReplyConfig = {
  enabled: boolean
  defaultReply: string
  rules: AutoReplyRule[]
  verifyToken: string
}

const KEYS = {
  enabled: 'social.facebook.autoreply_enabled',
  defaultReply: 'social.facebook.autoreply_default',
  rules: 'social.facebook.autoreply_rules',
  verifyToken: 'social.facebook.webhook_verify_token',
}

export async function getAutoReplyConfig(): Promise<AutoReplyConfig> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(KEYS) } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  let rules: AutoReplyRule[] = []
  try { rules = JSON.parse(map.get(KEYS.rules) ?? '[]') } catch { rules = [] }
  return {
    enabled: map.get(KEYS.enabled) === 'true',
    defaultReply: map.get(KEYS.defaultReply) ?? '',
    rules: Array.isArray(rules) ? rules : [],
    verifyToken: map.get(KEYS.verifyToken) ?? '',
  }
}

export async function saveAutoReplyConfig(input: {
  enabled: boolean
  defaultReply: string
  rules: AutoReplyRule[]
  verifyToken?: string
}): Promise<void> {
  const ups: Array<{ key: string; value: string }> = [
    { key: KEYS.enabled, value: input.enabled ? 'true' : 'false' },
    { key: KEYS.defaultReply, value: input.defaultReply.trim() },
    { key: KEYS.rules, value: JSON.stringify(input.rules.filter((r) => r.keyword.trim() && r.reply.trim())) },
  ]
  if (input.verifyToken && input.verifyToken.trim()) {
    ups.push({ key: KEYS.verifyToken, value: input.verifyToken.trim() })
  }
  await Promise.all(
    ups.map((u) => prisma.siteSetting.upsert({ where: { key: u.key }, create: u, update: { value: u.value } }))
  )
}

/** Chọn câu trả lời theo từ khoá (khớp đầu tiên), fallback câu mặc định. null nếu không có. */
export function pickReply(message: string, cfg: AutoReplyConfig): string | null {
  const text = (message ?? '').toLowerCase()
  for (const r of cfg.rules) {
    if (r.keyword.trim() && text.includes(r.keyword.trim().toLowerCase())) return r.reply
  }
  return cfg.defaultReply.trim() || null
}

/** Xử lý 1 sự kiện comment từ webhook → tự trả lời nếu bật. Bỏ qua comment của chính page (chống lặp). */
export async function handleCommentEvent(value: {
  item?: string; verb?: string; comment_id?: string; from?: { id?: string }; message?: string
}): Promise<void> {
  if (value.item !== 'comment' || value.verb !== 'add' || !value.comment_id) return
  const cfg = await getAutoReplyConfig()
  if (!cfg.enabled) return

  const fb = await getFacebookConfig()
  if (!fb) return
  if (value.from?.id && value.from.id === fb.pageId) return // comment của chính page → bỏ

  const reply = pickReply(value.message ?? '', cfg)
  if (!reply) return
  await addComment(value.comment_id, reply).catch(() => null)
}
