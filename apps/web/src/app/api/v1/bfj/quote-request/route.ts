import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { sendQuoteRequestEmail } from '@/lib/email.service'

const schema = z.object({
  sourceUrl: z.string().url().max(2000),
  productName: z.string().min(1).max(500),
  productImage: z.string().url().max(2000).optional().nullable(),
  productModel: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Vui lòng đăng nhập để yêu cầu báo giá.' }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, profile: { select: { fullName: true } } },
    })
    if (!user) return apiError('Không tìm thấy thông tin người dùng.', 404)

    const quote = await prisma.bfjQuoteRequest.create({
      data: {
        userId: session.user.id,
        sourceUrl: data.sourceUrl,
        productName: data.productName,
        productImage: data.productImage ?? null,
        productModel: data.productModel ?? null,
        notes: data.notes ?? null,
      },
    })

    // Send confirmation email (non-blocking — don't fail if email fails)
    let emailSent = false
    try {
      await sendQuoteRequestEmail({
        email: user.email,
        fullName: user.profile?.fullName ?? 'Khách hàng',
        productName: data.productName,
        productImage: data.productImage,
        productModel: data.productModel,
        sourceUrl: data.sourceUrl,
        notes: data.notes,
      })
      emailSent = true
      await prisma.bfjQuoteRequest.update({ where: { id: quote.id }, data: { emailSent: true } })
    } catch {
      // Email error is non-fatal — quote is still recorded
    }

    return apiSuccess({ id: quote.id, emailSent }, 'Yêu cầu báo giá đã được tiếp nhận.', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
