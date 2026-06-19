import { prisma } from '@japanvip/db'
import { AuctionFeesForm } from '@/components/admin/auction-fees-form'

export const metadata = { title: 'Phí Đấu Giá — Admin' }
export const dynamic = 'force-dynamic'

export default async function AuctionFeesPage() {
  const [feeRateRow, shippingRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: 'auction_fee_rate' } }),
    prisma.siteSetting.findUnique({ where: { key: 'auction_shipping_fee' } }),
  ])

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-white">Phí Đấu Giá</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cấu hình phí dịch vụ và phí vận chuyển hiển thị trong chi phí ước tính cho người mua
        </p>
      </div>

      <AuctionFeesForm
        auctionFeeRate={parseFloat(feeRateRow?.value ?? '2')}
        shippingFee={parseInt(shippingRow?.value ?? '150000', 10)}
      />
    </div>
  )
}
