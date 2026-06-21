import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

const createSchema = z.object({
  productId: z.string().uuid().optional(),
  destinationUrl: z.string().max(500).regex(/^\/[A-Za-z0-9/_-]*$/, 'Đường dẫn không hợp lệ').optional(),
  label: z.string().max(200).optional(),
})

// Mã link 6 ký tự không gây nhầm (bỏ O/0/I/1)
function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

async function requirePartner(userId: string) {
  return prisma.partnerProfile.findUnique({
    where: { userId },
    select: { id: true, refCode: true, status: true },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })
  const partner = await requirePartner(session.user.id)
  if (!partner) return NextResponse.json({ success: false, error: 'Bạn chưa phải là cộng tác viên' }, { status: 403 })

  const links = await prisma.affiliateLink.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, trackingCode: true, label: true, destinationUrl: true,
      clicks: true, orders: true, revenue: true, commission: true, createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: { refCode: partner.refCode, links } })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })
  const partner = await requirePartner(session.user.id)
  if (!partner) return NextResponse.json({ success: false, error: 'Bạn chưa phải là cộng tác viên' }, { status: 403 })
  if (partner.status !== 'APPROVED') return NextResponse.json({ success: false, error: 'Tài khoản CTV chưa được duyệt' }, { status: 403 })

  try {
    const body = createSchema.parse(await req.json())

    let destinationUrl = body.destinationUrl ?? '/'
    let label = body.label?.trim() || null
    let productId: string | null = null

    if (body.productId) {
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        select: { id: true, slug: true, name: true, status: true },
      })
      if (!product || product.status !== 'ACTIVE') {
        return NextResponse.json({ success: false, error: 'Sản phẩm không tồn tại hoặc đã ẩn' }, { status: 400 })
      }
      productId = product.id
      destinationUrl = `/${product.slug}`
      if (!label) label = product.name
    }

    // Sinh trackingCode duy nhất (thử lại nếu trùng)
    let trackingCode = genCode()
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.affiliateLink.findUnique({ where: { trackingCode }, select: { id: true } })
      if (!exists) break
      trackingCode = genCode()
    }

    const link = await prisma.affiliateLink.create({
      data: { partnerId: partner.id, productId, trackingCode, destinationUrl, label },
      select: {
        id: true, trackingCode: true, label: true, destinationUrl: true,
        clicks: true, orders: true, revenue: true, commission: true, createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: link }, { status: 201 })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập' }, { status: 401 })
  const partner = await requirePartner(session.user.id)
  if (!partner) return NextResponse.json({ success: false, error: 'Bạn chưa phải là cộng tác viên' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 })

  // Chỉ xóa link của chính mình
  const link = await prisma.affiliateLink.findFirst({ where: { id, partnerId: partner.id }, select: { id: true } })
  if (!link) return NextResponse.json({ success: false, error: 'Không tìm thấy link' }, { status: 404 })

  await prisma.affiliateLink.delete({ where: { id: link.id } })
  return NextResponse.json({ success: true })
}
