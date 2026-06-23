import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import './globals.css'
import { getAllFontVariableClasses, getFontCssVar } from '@/lib/fonts'
import { getActiveFont } from '@/lib/font-settings'

// Bọc cache để lệnh Redis (fetch no-store) không ép cả site render động
const getActiveFontCached = unstable_cache(getActiveFont, ['active-font-v1'], { revalidate: 300, tags: ['site-config'] })
import { ContentProtection } from '@/components/content-protection'
import { Providers } from '@/components/providers'
import { AffiliateClickTracker } from '@/components/affiliate/affiliate-click-tracker'
import { getSiteConfig } from '@/lib/site-config'

// Reads site verification codes (Google / Bing / Facebook) from DB and injects meta tags
export async function generateMetadata(): Promise<Metadata> {
  const map = await getSiteConfig()
  const faviconUrl = map['site_favicon_url']
  const googleVerify = map['site_google_verification']
  const bingVerify = map['site_bing_verification']

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'),
    title: {
      default: 'Japan VIP — Hàng Gia Dụng Nội Địa Nhật Bản Chính Hãng',
      template: '%s | Japan VIP',
    },
    description:
      'Phân phối hàng gia dụng nội địa Nhật Bản mới 100%, chính hãng. Dịch vụ mua hộ từ Nhật, đấu giá hàng Nhật uy tín tại Việt Nam.',
    keywords: ['hàng nội địa Nhật', 'gia dụng Nhật Bản', 'mua hộ Nhật', 'đấu giá hàng Nhật'],
    authors: [{ name: 'Japan VIP', url: 'https://store.japanvip.vn' }],
    ...(faviconUrl
      ? { icons: { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl } }
      : {}),
    ...((googleVerify || bingVerify)
      ? {
          verification: {
            ...(googleVerify ? { google: googleVerify } : {}),
            ...(bingVerify ? { other: { 'msvalidate.01': bingVerify } } : {}),
          },
        }
      : {}),
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: 'https://store.japanvip.vn',
      siteName: 'Japan VIP',
      title: 'Japan VIP — Hàng Gia Dụng Nội Địa Nhật Bản Chính Hãng',
      description: 'Phân phối hàng gia dụng nội địa Nhật Bản mới 100%, chính hãng.',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Japan VIP — Hàng Gia Dụng Nội Địa Nhật Bản',
      description: 'Phân phối hàng gia dụng nội địa Nhật Bản mới 100%, chính hãng.',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [activeFont, cfg] = await Promise.all([getActiveFontCached(), getSiteConfig()])
  const activeFontVar = getFontCssVar(activeFont)
  const contentProtectionEnabled = cfg['content_protection_enabled'] !== 'false'
  const facebookVerify = cfg['site_facebook_verification']
  const fbPixelId = cfg['site_facebook_pixel_id']
  const ga4Id = cfg['site_ga4_id']

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={getAllFontVariableClasses()}
      style={{ '--font-sans': `var(${activeFontVar})` } as React.CSSProperties}
    >
      <head>
        {/* ?v=N — cache-bust: bump version mỗi khi sửa style.css để trình duyệt tải bản mới ngay (tránh kẹt cache 4h) */}
        <link rel="stylesheet" href="/style.css?v=20260623" />
        {facebookVerify && (
          <meta name="facebook-domain-verification" content={facebookVerify} />
        )}
        {fbPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`,
            }}
          />
        )}
        {ga4Id && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4Id}');`,
              }}
            />
          </>
        )}
      </head>
      <body>
        {fbPixelId && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        )}
        <ContentProtection enabled={contentProtectionEnabled} />
        <AffiliateClickTracker />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
