import type { Metadata } from 'next'
import './globals.css'
import { getAllFontVariableClasses, getFontCssVar } from '@/lib/fonts'
import { getActiveFont } from '@/lib/font-settings'
import { ContentProtection } from '@/components/content-protection'
import { Providers } from '@/components/providers'
import { prisma } from '@japanvip/db'

export async function generateMetadata(): Promise<Metadata> {
  const faviconSetting = await prisma.siteSetting
    .findUnique({ where: { key: 'site_favicon_url' } })
    .catch(() => null)
  const faviconUrl = faviconSetting?.value?.trim()

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
  const [activeFont, protectionSetting] = await Promise.all([
    getActiveFont(),
    prisma.siteSetting.findUnique({ where: { key: 'content_protection_enabled' } }).catch(() => null),
  ])
  const activeFontVar = getFontCssVar(activeFont)
  const contentProtectionEnabled = protectionSetting?.value !== 'false'

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={getAllFontVariableClasses()}
      style={{ '--font-sans': `var(${activeFontVar})` } as React.CSSProperties}
    >
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <ContentProtection enabled={contentProtectionEnabled} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
