/**
 * Referral Settings — cấu hình chương trình giới thiệu qua SiteSetting (key prefix "referral.").
 * Cache 30s để không query DB mỗi lần.
 */

import { prisma } from '@japanvip/db'

const CACHE_TTL = 30_000
let cache: Record<string, string> | null = null
let cacheAt = 0

export const REFERRAL_DEFAULTS = {
  ENABLED:            'true',
  REFERRER_POINTS:    '50000',  // điểm cho người đi mời (≈ 50.000₫ giảm giá)
  REFEREE_POINTS:     '20000',  // điểm chào mừng cho người được mời
  MAX_REDEEM_PERCENT: '30',     // tối đa % giá trị đơn được trừ bằng điểm
} as const

export type ReferralSettingKey = keyof typeof REFERRAL_DEFAULTS

async function loadSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { startsWith: 'referral.' } },
    })
    const loaded = Object.fromEntries(rows.map((r) => [r.key.slice(9), r.value]))
    cache = { ...REFERRAL_DEFAULTS, ...loaded }
    cacheAt = Date.now()
    return cache
  } catch {
    return { ...REFERRAL_DEFAULTS }
  }
}

function get(s: Record<string, string>, key: ReferralSettingKey): string {
  return s[key] ?? REFERRAL_DEFAULTS[key]
}

export async function isReferralEnabled(): Promise<boolean> {
  const s = await loadSettings()
  return get(s, 'ENABLED') !== 'false'
}

export async function getReferralSetting(key: ReferralSettingKey): Promise<string> {
  const s = await loadSettings()
  return get(s, key)
}

export async function getReferralPoints(): Promise<{ referrer: number; referee: number; maxRedeemPercent: number }> {
  const s = await loadSettings()
  return {
    referrer: parseInt(get(s, 'REFERRER_POINTS'), 10) || 0,
    referee: parseInt(get(s, 'REFEREE_POINTS'), 10) || 0,
    maxRedeemPercent: parseInt(get(s, 'MAX_REDEEM_PERCENT'), 10) || 0,
  }
}

export async function getAllReferralSettings(): Promise<Record<ReferralSettingKey, string>> {
  const s = await loadSettings()
  return {
    ENABLED: get(s, 'ENABLED'),
    REFERRER_POINTS: get(s, 'REFERRER_POINTS'),
    REFEREE_POINTS: get(s, 'REFEREE_POINTS'),
    MAX_REDEEM_PERCENT: get(s, 'MAX_REDEEM_PERCENT'),
  }
}

export function invalidateReferralCache() {
  cache = null
  cacheAt = 0
}
