import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      productId,
      quantity,
      startPrice,
      minIncrement = 50000,
      reservePrice,
      buyNowPrice,
      startsAt,
      endsAt,
      extendTrigger = 3,
      extendMinutes = 3,
      unitConditions = [], // array of strings, length = quantity
    } = body

    if (!productId || !quantity || quantity < 1 || quantity > 50) {
      return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    if (!startPrice || !startsAt || !endsAt) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json({ success: false, error: 'Thời gian không hợp lệ' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) {
      return NextResponse.json({ success: false, error: 'Sản phẩm không tồn tại' }, { status: 404 })
    }

    // Generate sequential auction numbers: BATCH-YYYYMMDD-001, 002, ...
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `AU-${datePart}`

    // Find highest existing auctionNumber with this prefix
    const existing = await prisma.auction.findMany({
      where: { auctionNumber: { startsWith: prefix } },
      select: { auctionNumber: true },
      orderBy: { auctionNumber: 'desc' },
      take: 1,
    })

    let counter = 1
    if (existing.length > 0) {
      const last = existing[0]?.auctionNumber ?? ''
      const lastNum = parseInt(last.split('-').pop() ?? '0', 10)
      if (!isNaN(lastNum)) counter = lastNum + 1
    }

    const auctions = await prisma.$transaction(
      Array.from({ length: quantity }, (_, i) => {
        const num = String(counter + i).padStart(3, '0')
        const auctionNumber = `${prefix}-${num}`
        const condition = unitConditions[i] ?? null

        return prisma.auction.create({
          data: {
            auctionNumber,
            productId,
            type: 'JAPANVIP_OWNED',
            status: 'DRAFT',
            startPrice,
            currentPrice: startPrice,
            minIncrement,
            reservePrice: reservePrice ?? null,
            buyNowPrice: buyNowPrice ?? null,
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            extendTrigger,
            extendMinutes,
            autoExtend: true,
            unitCondition: condition,
            unitImages: [],
            createdBy: session.user.id,
          },
          select: { id: true, auctionNumber: true },
        })
      })
    )

    return NextResponse.json({ success: true, data: { auctions, count: auctions.length } })
  } catch (err) {
    console.error('[batch-auction]', err)
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}
