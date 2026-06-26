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

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://japanvip.vn'
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: 'Japan VIP — Hàng Gia Dụng Nội Địa Nhật Bản Chính Hãng',
      template: '%s | Japan VIP',
    },
    description:
      'Phân phối hàng gia dụng nội địa Nhật Bản mới 100%, chính hãng: bếp từ, máy giặt, nồi cơm, tủ lạnh. Mua hộ & đấu giá hàng Nhật uy tín, giao toàn quốc.',
    keywords: ['hàng nội địa Nhật', 'gia dụng Nhật Bản', 'mua hộ Nhật', 'đấu giá hàng Nhật'],
    authors: [{ name: 'Japan VIP', url: APP_URL }],
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
      url: APP_URL,
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
  const gtmId = cfg['site_gtm_id']

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={getAllFontVariableClasses()}
      style={{ '--font-sans': `var(${activeFontVar})` } as React.CSSProperties}
    >
      <head>
        {/* Google Tag Manager — đặt cao nhất trong <head> theo chuẩn GTM */}
        {gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
        {/* ?v=N — cache-bust: bump version mỗi khi sửa style.css để trình duyệt tải bản mới ngay (tránh kẹt cache 4h) */}
        <link rel="stylesheet" href="/style.css?v=20260626a" />
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
          // Stub gtag chạy sớm (event không mất) nhưng CHỈ tải gtag.js sau tương tác đầu / sau 4s
          // → GA4 không đụng main-thread lúc render (LCP/TBT/SI sạch), vẫn track người ở lại.
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4Id}');(function(){var done=false,ev=['scroll','mousemove','touchstart','click','keydown'];function load(){if(done)return;done=true;ev.forEach(function(e){window.removeEventListener(e,load)});var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${ga4Id}';document.head.appendChild(s)}ev.forEach(function(e){window.addEventListener(e,load,{passive:true})});setTimeout(load,4000)})();`,
            }}
          />
        )}
      </head>
      <body>
        {/* Google Tag Manager (noscript) — ngay sau <body> theo chuẩn GTM */}
        {gtmId && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        )}
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
