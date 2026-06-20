import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { redisGet, redisSet } from '@/lib/redis'
import { escapeHtml } from '@/lib/escape-html'
import nodemailer from 'nodemailer'
import { prisma } from '@japanvip/db'
import { verifyOtp } from '@/lib/otp.service'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase().trim(),
  otpCode: z.string().length(6).regex(/^\d{6}$/),
  phone: z.string().min(9).max(15).regex(/^[0-9+\s\-()]+$/),
  address: z.string().max(300).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  notes: z.string().max(500).optional(),
  productId: z.string().uuid('Sản phẩm không hợp lệ'),
  refCode: z.string().max(20).regex(/^[A-Z0-9_-]+$/i).optional(),
})

async function getSmtp() {
  try {
    const s = await prisma.bfjSetting.findUnique({ where: { id: 'default' } })
    if (s?.smtpHost && s?.smtpUser && s?.smtpPass) {
      return { host: s.smtpHost, port: s.smtpPort, secure: s.smtpSecure, user: s.smtpUser, pass: s.smtpPass, from: s.smtpFrom ?? `Japan VIP <${s.smtpUser}>` }
    }
  } catch {}
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = parseInt(process.env.SMTP_PORT ?? '465', 10)
  return { host, port, secure: port === 465, user, pass, from: process.env.SMTP_FROM ?? `Japan VIP <${user}>` }
}

export async function POST(req: NextRequest) {
  // CSRF: exact origin match only
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  const allowedOrigin = `https://${host}`
  if (!origin || (origin !== allowedOrigin && process.env.NODE_ENV !== 'development')) {
    return apiError('Forbidden', 403)
  }

  // Idempotency — chống double-submit
  const idempotencyKey = req.headers.get('x-idempotency-key')
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(idempotencyKey)) {
    return apiError('x-idempotency-key (UUID v4) là bắt buộc', 400)
  }
  const idemCacheKey = `idem:quick-order:${idempotencyKey}`
  const cachedResponse = await redisGet(idemCacheKey)
  if (cachedResponse) return NextResponse.json(JSON.parse(cachedResponse))

  const { allowed } = await rateLimit(req, 'quick-order')
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau.', 429)

  try {
    const body = schema.parse(await req.json())

    const otpValid = await verifyOtp(body.email, body.otpCode, 'quick_order')
    if (!otpValid) return apiError('Mã OTP không đúng hoặc đã hết hạn. Vui lòng gửi lại.', 400)

    // Lấy thông tin sản phẩm từ DB — không tin client (chống price tampering + pollution)
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: {
        id: true,
        name: true,
        slug: true,
        salePrice: true,
        originPrice: true,
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
      },
    })
    if (!product) return apiError('Sản phẩm không tồn tại', 400)

    const priceVnd = product.salePrice != null
      ? Number(product.salePrice)
      : product.originPrice != null
      ? Number(product.originPrice)
      : null
    const productImage = product.images[0]?.url ?? null

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
    const fmtVND = (n: number) => n.toLocaleString('vi-VN') + '₫'
    const orderRef = `DH${Date.now().toString(36).toUpperCase()}`

    // Resolve refCode → partner
    let affiliateId: string | null = null
    let resolvedRefCode: string | null = null
    // Also check cookie if no refCode in body
    const cookieRefCode = req.cookies.get('ref')?.value
    const refCode = body.refCode ?? (cookieRefCode && /^[A-Z0-9_-]{3,20}$/i.test(cookieRefCode) ? cookieRefCode : undefined)
    if (refCode) {
      const partner = await prisma.partnerProfile.findUnique({
        where: { refCode: refCode.toUpperCase(), status: 'APPROVED' },
        select: { id: true, refCode: true },
      })
      if (partner) {
        affiliateId = partner.id
        resolvedRefCode = partner.refCode
      }
    }

    // Lưu đơn vào DB — giá & tên sản phẩm lấy từ DB
    await prisma.quickOrder.create({
      data: {
        orderRef,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address ?? null,
        notes: body.notes ?? null,
        productId: product.id,
        productName: product.name,
        productImage,
        productSlug: product.slug,
        priceVnd,
        quantity: body.quantity,
        refCode: resolvedRefCode,
        affiliateId,
      },
    })

    // Tạo hoa hồng nếu có affiliate và đơn có giá
    if (affiliateId && priceVnd && priceVnd > 0) {
      const partnerProfile = await prisma.partnerProfile.findUnique({
        where: { id: affiliateId },
        select: { defaultCommissionRate: true },
      })
      if (partnerProfile) {
        const rate = Number(partnerProfile.defaultCommissionRate)
        const commissionAmount = Math.round(priceVnd * body.quantity * rate)
        await prisma.affiliateCommission.create({
          data: {
            partnerId: affiliateId,
            orderRef,
            productName: product.name,
            orderAmount: priceVnd * body.quantity,
            commissionRate: rate,
            commissionAmount,
            status: 'PENDING',
          },
        })
      }
    }

    const smtp = await getSmtp()
    if (smtp) {
      const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } })

      // Notify admin — escape mọi input của khách để chống HTML injection
      const safeName = escapeHtml(body.name)
      const safeEmail = escapeHtml(body.email)
      const safePhone = escapeHtml(body.phone)
      const safeAddress = escapeHtml(body.address)
      const safeNotes = escapeHtml(body.notes)
      const safeProductName = escapeHtml(product.name)

      await transport.sendMail({
        from: smtp.from,
        to: 'info@japanvip.vn',
        subject: `[Đặt hàng nhanh] ${safeName} — ${safeProductName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#b91c1c;margin:0 0 16px">🛒 Đơn đặt hàng nhanh mới</h2>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Mã tham chiếu: <strong style="color:#111">${orderRef}</strong></p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0"/>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;width:130px">Khách hàng</td><td style="font-weight:600;color:#111">${safeName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td><a href="mailto:${safeEmail}" style="color:#b91c1c;text-decoration:none">${safeEmail}</a></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Điện thoại</td><td><a href="tel:${safePhone}" style="font-weight:700;color:#b91c1c;text-decoration:none">${safePhone}</a></td></tr>
              ${safeAddress ? `<tr><td style="padding:6px 0;color:#6b7280">Địa chỉ</td><td>${safeAddress}</td></tr>` : ''}
              <tr><td style="padding:6px 0;color:#6b7280">Sản phẩm</td><td style="font-weight:600">${safeProductName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Số lượng</td><td>${body.quantity}</td></tr>
              ${priceVnd ? `<tr><td style="padding:6px 0;color:#6b7280">Đơn giá</td><td style="font-weight:700;color:#b91c1c">${fmtVND(priceVnd)}</td></tr>` : ''}
              ${safeNotes ? `<tr><td style="padding:6px 0;color:#6b7280">Ghi chú</td><td>${safeNotes}</td></tr>` : ''}
            </table>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0"/>
            <a href="${APP_URL}/admin/products/${product.id}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Xem sản phẩm trong admin →</a>
          </div>
        `,
      }).catch(() => {})
    }

    const response = { success: true, data: { orderRef }, message: 'Đặt hàng thành công' }
    await redisSet(idemCacheKey, JSON.stringify(response), 300)
    return apiSuccess({ orderRef }, 'Đặt hàng thành công', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
