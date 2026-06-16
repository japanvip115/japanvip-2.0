import type { FontKey } from './fonts'
import { DEFAULT_FONT } from './fonts'
import { getCached, setCached, invalidateCache } from './redis'

const CACHE_KEY = 'site:font:active'
const CACHE_TTL = 3600 // 1 hour

export async function getActiveFont(): Promise<FontKey> {
  // 1. Redis cache (fastest path)
  try {
    const cached = await getCached<FontKey>(CACHE_KEY)
    if (cached) return cached
  } catch {}

  // 2. Database
  try {
    const { prisma } = await import('@japanvip/db')
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'font.active' },
      select: { value: true },
    })
    if (setting?.value) {
      const font = setting.value as FontKey
      await setCached(CACHE_KEY, font, CACHE_TTL).catch(() => {})
      return font
    }
  } catch {}

  // 3. Environment variable override
  const envFont = process.env.SITE_ACTIVE_FONT as FontKey | undefined
  if (envFont) return envFont

  return DEFAULT_FONT
}

export async function setActiveFont(font: FontKey): Promise<void> {
  const { prisma } = await import('@japanvip/db')

  await prisma.siteSetting.upsert({
    where: { key: 'font.active' },
    create: { key: 'font.active', value: font },
    update: { value: font },
  })

  await invalidateCache(CACHE_KEY).catch(() => {})
}
