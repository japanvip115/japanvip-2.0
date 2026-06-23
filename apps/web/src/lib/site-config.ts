import { prisma } from '@japanvip/db'
import { unstable_cache } from 'next/cache'

const KEYS = [
  'site_favicon_url',
  'site_google_verification',
  'site_bing_verification',
  'site_facebook_verification',
  'site_facebook_pixel_id',
  'site_ga4_id',
  'content_protection_enabled',
] as const

export type SiteConfig = Partial<Record<(typeof KEYS)[number], string>>

// Config toàn site (favicon, mã xác minh, pixel, GA, chống copy) — gần như không
// đổi nên cache 5 phút. Trước đây layout query Neon mỗi request → chậm MỌI trang.
export const getSiteConfig = unstable_cache(
  async (): Promise<SiteConfig> => {
    const rows = await prisma.siteSetting
      .findMany({ where: { key: { in: [...KEYS] } } })
      .catch(() => [] as { key: string; value: string }[])
    return Object.fromEntries(rows.map((r) => [r.key, r.value?.trim()])) as SiteConfig
  },
  ['site-config-v1'],
  { revalidate: 300, tags: ['site-config'] }
)
