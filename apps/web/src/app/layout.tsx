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

// Critical above-the-fold CSS inlined để bỏ render-blocking + tránh FOUC.
// Full style.css (96KB) được async-load off critical path (xem <head>).
// Chỉ chứa: biến màu, reset, container, section/button/hero/trust/url-tool — phần above-the-fold.
const CRITICAL_CSS = `:root{--jp-red:#c41e3a;--jp-red-light:#e63950;--jp-red-dark:#a01830;--jp-black:#0d0d0d;--jp-dark:#1a1a1a;--jp-gray-900:#111827;--jp-gray-800:#1f2937;--jp-gray-700:#374151;--jp-gray-600:#4b5563;--jp-gray-400:#9ca3af;--jp-gray-300:#d1d5db;--jp-gray-200:#e5e7eb;--jp-gray-100:#f3f4f6;--jp-gray-50:#f9fafb;--jp-white:#fff;--jp-gold:#c9a84c;--jp-gold-light:#e8c97a;--gradient-red:linear-gradient(135deg,#c41e3a 0%,#e63950 100%);--gradient-dark:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);--gradient-gold:linear-gradient(135deg,#c9a84c 0%,#e8c97a 100%);--shadow-sm:0 1px 3px rgba(0,0,0,.08);--shadow-md:0 4px 16px rgba(0,0,0,.1);--shadow-lg:0 8px 32px rgba(0,0,0,.14);--shadow-xl:0 16px 48px rgba(0,0,0,.18);--shadow-red:0 8px 24px rgba(196,30,58,.28);--radius-sm:6px;--radius-md:12px;--radius-lg:18px;--radius-xl:24px;--radius-full:9999px;--transition:all .25s cubic-bezier(.4,0,.2,1);--header-height:130px}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{font-size:16px;scroll-padding-top:120px}body{font-family:var(--font-sans);color:var(--jp-gray-800);background:var(--jp-white);line-height:1.6;overflow-x:hidden}a{text-decoration:none;color:inherit}img{max-width:100%}button{cursor:pointer;border:none;background:none;font-family:inherit}input,select,textarea{font-family:inherit;outline:none}ul,ol{list-style:none}.container{max-width:1280px;margin:0 auto;padding:0 24px}.section-label{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--jp-red);margin-bottom:10px}.section-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;gap:20px}.section-header h2{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:700;line-height:1.3;color:var(--jp-gray-900)}.section-header.centered{flex-direction:column;align-items:center;text-align:center}.see-all-link{font-size:.9rem;font-weight:600;color:var(--jp-red);white-space:nowrap;display:flex;align-items:center;gap:4px;transition:var(--transition);padding-bottom:4px}.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--gradient-red);color:var(--jp-white);padding:12px 28px;border-radius:var(--radius-full);font-size:.9rem;font-weight:600;letter-spacing:.02em;transition:var(--transition);box-shadow:var(--shadow-red);white-space:nowrap}.btn-primary.large{padding:14px 36px;font-size:1rem}.btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--jp-gray-800);padding:12px 28px;border-radius:var(--radius-full);border:1.5px solid var(--jp-gray-300);font-size:.9rem;font-weight:600;transition:var(--transition)}.btn-outline.large{padding:14px 36px;font-size:1rem}.btn-outline-white{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#fff;padding:12px 28px;border-radius:var(--radius-full);border:1.5px solid rgba(255,255,255,.5);font-size:.9rem;font-weight:600;transition:var(--transition)}.page-hero.simple{background:linear-gradient(135deg,var(--jp-gray-900) 0%,#1a1a2e 100%);color:#fff;padding:60px 0 50px;position:relative;overflow:hidden}.page-hero h1{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;margin-bottom:12px}.page-hero p{color:rgba(255,255,255,.75);font-size:1.05rem;max-width:600px}.breadcrumb{display:flex;align-items:center;gap:8px;font-size:.82rem;color:rgba(255,255,255,.6);margin-bottom:16px;cursor:pointer}.hero{position:relative;overflow:hidden;min-height:580px}.hero-slide{position:relative;min-height:580px}.hero .container{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:40px;min-height:580px;padding-top:60px;padding-bottom:60px}.hero-content{flex:1;max-width:580px}.hero-title{font-size:clamp(2.2rem,5vw,3.5rem);font-weight:700;color:#fff;line-height:1.2;margin-bottom:16px}.hero-desc{color:rgba(255,255,255,.75);font-size:1.05rem;line-height:1.7;margin-bottom:32px;max-width:500px}.hero-actions{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:40px}.trust-bar{background:var(--jp-gray-900);padding:20px 0}.trust-items{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.trust-item{display:flex;align-items:center;gap:12px;flex:1;min-width:160px}.trust-icon{font-size:1.5rem;flex-shrink:0}.trust-item strong{display:block;font-size:.85rem;font-weight:600;color:#fff}.trust-item span{font-size:.75rem;color:rgba(255,255,255,.55)}.url-tool-section{padding:32px 0;background:var(--jp-gray-50)}.url-tool-wrapper{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.categories-section{padding:32px 0}`

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
        {/* Critical CSS above-the-fold inline → first paint không chờ style.css */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        {/* ?v=N — cache-bust: bump version mỗi khi sửa style.css. Async-load (JS injection) để bỏ render-blocking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='/style.css?v=20260624c';document.head.appendChild(l)})()`,
          }}
        />
        <noscript dangerouslySetInnerHTML={{ __html: '<link rel="stylesheet" href="/style.css?v=20260624c">' }} />
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
