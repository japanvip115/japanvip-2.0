import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { FloatingContact } from '@/components/layout/floating-contact'
import { ChatWidget } from '@/components/livechat/chat-widget'
import { WebVitalsReporter } from '@/components/perf/web-vitals-reporter'

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://japanvip.vn/#organization',
      name: 'Japan VIP',
      url: 'https://japanvip.vn',
      logo: { '@type': 'ImageObject', url: 'https://japanvip.vn/logo.png' },
      description: 'Nhập khẩu và phân phối hàng gia dụng nội địa Nhật Bản chính hãng tại Việt Nam.',
      telephone: '+84988969896',
      email: 'info@japanvip.vn',
      address: [
        { '@type': 'PostalAddress', streetAddress: '115 Đinh Tiên Hoàng', addressLocality: 'Hải Phòng', addressCountry: 'VN' },
        { '@type': 'PostalAddress', streetAddress: '21 Lê Văn Lương', addressLocality: 'Hà Nội', addressCountry: 'VN' },
      ],
      sameAs: ['https://facebook.com/japanvip', 'https://youtube.com/c/JapanvipVn1', 'https://zalo.me/0988969896'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://japanvip.vn/#website',
      name: 'Japan VIP',
      url: 'https://japanvip.vn',
      publisher: { '@id': 'https://japanvip.vn/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://japanvip.vn/san-pham?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Store',
      '@id': 'https://japanvip.vn/#store-haiphong',
      name: 'Japan VIP — Trụ sở Hải Phòng',
      image: 'https://japanvip.vn/og-default.jpg',
      url: 'https://japanvip.vn',
      telephone: '+842253822526',
      priceRange: '₫₫₫',
      parentOrganization: { '@id': 'https://japanvip.vn/#organization' },
      address: { '@type': 'PostalAddress', streetAddress: '115 Đinh Tiên Hoàng', addressLocality: 'Hồng Bàng', addressRegion: 'Hải Phòng', addressCountry: 'VN' },
      geo: { '@type': 'GeoCoordinates', latitude: 20.8589, longitude: 106.6839 },
      openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '08:00', closes: '18:30' },
    },
    {
      '@type': 'Store',
      '@id': 'https://japanvip.vn/#store-hanoi',
      name: 'Japan VIP — Showroom Hà Nội',
      image: 'https://japanvip.vn/og-default.jpg',
      url: 'https://japanvip.vn',
      telephone: '+84988969896',
      priceRange: '₫₫₫',
      parentOrganization: { '@id': 'https://japanvip.vn/#organization' },
      address: { '@type': 'PostalAddress', streetAddress: '21 Lê Văn Lương', addressLocality: 'Thanh Xuân', addressRegion: 'Hà Nội', addressCountry: 'VN' },
      geo: { '@type': 'GeoCoordinates', latitude: 20.9935, longitude: 105.8009 },
      openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '08:00', closes: '18:30' },
    },
  ],
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingContact />
      <ChatWidget />
      <WebVitalsReporter />
    </div>
  )
}
