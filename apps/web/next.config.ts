import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
  // Domain chính = japanvip.vn. store/www → 301 redirect về apex (gộp SEO, không trùng nội dung).
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'store.japanvip.vn' }],
        destination: 'https://japanvip.vn/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.japanvip.vn' }],
        destination: 'https://japanvip.vn/:path*',
        permanent: true,
      },
    ]
  },
  typedRoutes: false,
  serverExternalPackages: ['@prisma/client', '@japanvip/db', 'xlsx', 'playwright-core'],
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000, // cache ảnh đã tối ưu 1 năm (giảm tải lại)
    remotePatterns: [
      { protocol: 'https', hostname: 'img.vietqr.io' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: 'media.japanvip.vn' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'thumbnail.image.rakuten.co.jp' },
      // Scrape sources — ảnh lấy từ trang ngoài khi import bài viết / sản phẩm
      { protocol: 'https', hostname: 'congnghenhat.com' },
      { protocol: 'https', hostname: '*.congnghenhat.com' },
      { protocol: 'http', hostname: 'congnghenhat.com' },
      { protocol: 'https', hostname: 'phongcachnhat.vn' },
      { protocol: 'https', hostname: '*.phongcachnhat.vn' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Cho phép tải gtag.js/gtm.js (GA4/GTM) + fbevents.js (Meta Pixel) — nếu thiếu, CSP chặn tracking
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "media-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  poweredByHeader: false,
}

export default nextConfig
