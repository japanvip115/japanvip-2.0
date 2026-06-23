import { prisma } from '@japanvip/db'
import { encrypt, decrypt } from '@/lib/encrypt'

export type FacebookConfig = {
  pageId: string
  accessToken: string
  enabled: boolean
}

export const FB_KEYS = {
  pageId: 'social.facebook.page_id',
  accessToken: 'social.facebook.access_token', // encrypted
  enabled: 'social.facebook.enabled',
}

/** Config đã giải mã để gọi Graph API. null nếu thiếu pageId/token. */
export async function getFacebookConfig(): Promise<FacebookConfig | null> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'social.facebook.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const pageId = map.get(FB_KEYS.pageId) ?? ''
  let accessToken = ''
  const raw = map.get(FB_KEYS.accessToken)
  if (raw) { try { accessToken = decrypt(raw) } catch { accessToken = '' } }

  if (!pageId || !accessToken) return null
  return { pageId, accessToken, enabled: map.get(FB_KEYS.enabled) === 'true' }
}

/** Trạng thái cho UI — KHÔNG trả token. */
export async function getFacebookConfigStatus(): Promise<{ pageId: string; hasToken: boolean; enabled: boolean }> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'social.facebook.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    pageId: map.get(FB_KEYS.pageId) ?? '',
    hasToken: !!map.get(FB_KEYS.accessToken),
    enabled: map.get(FB_KEYS.enabled) === 'true',
  }
}

export async function saveFacebookConfig(input: {
  pageId: string
  accessToken?: string // chỉ cập nhật khi có giá trị mới (tránh ghi đè bằng rỗng)
  enabled: boolean
}): Promise<void> {
  const ups: Array<{ key: string; value: string }> = [
    { key: FB_KEYS.pageId, value: input.pageId.trim() },
    { key: FB_KEYS.enabled, value: input.enabled ? 'true' : 'false' },
  ]
  if (input.accessToken && input.accessToken.trim()) {
    ups.push({ key: FB_KEYS.accessToken, value: encrypt(input.accessToken.trim()) })
  }
  await Promise.all(
    ups.map((u) => prisma.siteSetting.upsert({ where: { key: u.key }, create: u, update: { value: u.value } }))
  )
}
