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

  return (
    <div>
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
