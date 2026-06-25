import type { Metadata } from 'next'
import { Suspense } from 'react'
import { prisma } from '@japanvip/db'
import { BfjHero } from '@/components/bfj/bfj-hero'
import { BfjUrlForm } from '@/components/bfj/bfj-url-form'
import { BfjHowItWorks } from '@/components/bfj/bfj-how-it-works'
import { BfjFaq } from '@/components/bfj/bfj-faq'

export const metadata: Metadata = {
  title: 'Mua Hộ Hàng Nhật Bản — Japan VIP',
  description:
    'Dán link sản phẩm từ Amazon Nhật, Rakuten, Mercari, Yahoo Shopping — Japan VIP mua và ship về Việt Nam. Phí dịch vụ từ 8%, ship nhanh 7–21 ngày.',
  openGraph: {
    title: 'Mua Hộ Hàng Nhật Bản — Japan VIP',
    description: 'Dán link sản phẩm từ Amazon Nhật, Rakuten, Mercari — Japan VIP mua và ship về VN.',
  },
}

export default async function BuyFromJapanPage() {
  const [setting, tiers] = await Promise.all([
    prisma.bfjSetting.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }),
    prisma.bfjShippingTier.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  // Label for static display: "Từ 450,000đ" based on cheapest tier
  const cheapestTier = tiers[0]
  const shippingLabel = cheapestTier
    ? `Từ ${cheapestTier.priceVnd.toLocaleString('vi-VN')}đ`
    : 'Theo kg'

  const fees = {
    serviceFeeRate: Number(setting.serviceFeeRate),
    domesticShippingJpy: Number(setting.domesticShippingJpy),
    surchargeRate: Number(setting.surchargeRate),
    depositRate: Number(setting.depositRate),
    shippingLabel,
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Phí dịch vụ mua hộ hàng Nhật là bao nhiêu?', acceptedAnswer: { '@type': 'Answer', text: 'Phí dịch vụ cố định 8% trên giá sản phẩm. Bao gồm: mua hàng, kiểm tra, đóng gói, hỗ trợ 1:1.' } },
      { '@type': 'Question', name: 'Mua hộ hàng Nhật mất bao lâu để nhận hàng?', acceptedAnswer: { '@type': 'Answer', text: 'Thông thường 7–21 ngày tùy trọng lượng và phương thức vận chuyển. Hàng đặc biệt (pin, lỏng) mất thêm 3–5 ngày.' } },
      { '@type': 'Question', name: 'Nếu sản phẩm hết hàng thì sao?', acceptedAnswer: { '@type': 'Answer', text: 'Japan VIP sẽ thông báo ngay và hoàn lại 100% tiền đặt cọc trong 1–3 ngày làm việc.' } },
      { '@type': 'Question', name: 'Có thể đặt nhiều sản phẩm trong 1 đơn không?', acceptedAnswer: { '@type': 'Answer', text: 'Có, bạn có thể đặt tối đa 20 sản phẩm từ nhiều nguồn khác nhau (Amazon Japan, Rakuten, Mercari, Yahoo Shopping) trong cùng 1 đơn hàng.' } },
      { '@type': 'Question', name: 'Những sản phẩm nào không được mua hộ từ Nhật?', acceptedAnswer: { '@type': 'Answer', text: 'Không nhận: thực phẩm tươi, chất lỏng trên 100ml, pin lithium rời, vũ khí, ma tuý và các mặt hàng bị cấm nhập khẩu vào Việt Nam.' } },
      { '@type': 'Question', name: 'Japan VIP hỗ trợ mua hàng từ những sàn Nhật nào?', acceptedAnswer: { '@type': 'Answer', text: 'Japan VIP hỗ trợ mua hàng từ Amazon Japan (amazon.co.jp), Rakuten, Mercari Japan và Yahoo Shopping Japan.' } },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BfjHero />
      <div className="container py-12">
        <Suspense fallback={null}>
          <BfjUrlForm fees={fees} />
        </Suspense>
      </div>
      <BfjHowItWorks />
      <BfjFaq />
    </div>
  )
}
