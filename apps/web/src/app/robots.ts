import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://store.japanvip.vn/sitemap.xml',
    host: 'https://store.japanvip.vn',
  }
}
