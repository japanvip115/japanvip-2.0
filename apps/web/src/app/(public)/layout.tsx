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
