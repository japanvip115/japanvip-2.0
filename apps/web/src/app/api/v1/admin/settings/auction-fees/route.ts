import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export async function PUT(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { auctionFeeRate, shippingFee } = await req.json()

  const feeRate = parseFloat(auctionFeeRate)
  const shipping = parseInt(shippingFee, 10)

  if (isNaN(feeRate) || feeRate < 0 || feeRate > 50) {
    return NextResponse.json({ success: false, error: 'Phí dịch vụ không hợp lệ (0–50%)' }, { status: 400 })
  }
  if (isNaN(shipping) || shipping < 0) {
    return NextResponse.json({ success: false, error: 'Phí vận chuyển không hợp lệ' }, { status: 400 })
  }

  await Promise.all([
    prisma.siteSetting.upsert({
      where: { key: 'auction_fee_rate' },
      create: { key: 'auction_fee_rate', value: String(feeRate) },
      update: { value: String(feeRate) },
    }),
    prisma.siteSetting.upsert({
      where: { key: 'auction_shipping_fee' },
      create: { key: 'auction_shipping_fee', value: String(shipping) },
      update: { value: String(shipping) },
    }),
  ])

  return NextResponse.json({ success: true })
}
