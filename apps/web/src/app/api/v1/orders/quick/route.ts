import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
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
  productId: z.string(),
  productName: z.string(),
  productImage: z.string().optional().nullable(),
  priceVnd: z.number().optional().nullable(),
  productSlug: z.string(),
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
  const { allowed } = await rateLimit(req, 'quick-order')
  if (!allowed) return apiError('Quá nhiều yêu cầu, vui lòng thử lại sau.', 429)

  try {
    const body = schema.parse(await req.json())

    const otpValid = await verifyOtp(body.email, body.otpCode, 'quick_order')
    if (!otpValid) return apiError('Mã OTP không đúng hoặc đã hết hạn. Vui lòng gửi lại.', 400)

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
    const fmtVND = (n: number) => n.toLocaleString('vi-VN') + '₫'
    const orderRef = `DH${Date.now().toString(36).toUpperCase()}`

    // Lưu đơn vào DB
    await prisma.quickOrder.create({
      data: {
        orderRef,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address ?? null,
        notes: body.notes ?? null,
        productId: body.productId,
        productName: body.productName,
        productImage: body.productImage ?? null,
        productSlug: body.productSlug,
        priceVnd: body.priceVnd ?? null,
        quantity: body.quantity,
      },
    })

    const smtp = await getSmtp()
    if (smtp) {
      const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } })

      // Notify admin
      await transport.sendMail({
        from: smtp.from,
        to: 'info@japanvip.vn',
        subject: `[Đặt hàng nhanh] ${body.name} — ${body.productName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#b91c1c;margin:0 0 16px">🛒 Đơn đặt hàng nhanh mới</h2>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Mã tham chiếu: <strong style="color:#111">${orderRef}</strong></p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0"/>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;width:130px">Khách hàng</td><td style="font-weight:600;color:#111">${body.name}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td><a href="mailto:${body.email}" style="color:#b91c1c;text-decoration:none">${body.email}</a></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Điện thoại</td><td><a href="tel:${body.phone}" style="font-weight:700;color:#b91c1c;text-decoration:none">${body.phone}</a></td></tr>
              ${body.address ? `<tr><td style="padding:6px 0;color:#6b7280">Địa chỉ</td><td>${body.address}</td></tr>` : ''}
              <tr><td style="padding:6px 0;color:#6b7280">Sản phẩm</td><td style="font-weight:600">${body.productName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Số lượng</td><td>${body.quantity}</td></tr>
              ${body.priceVnd ? `<tr><td style="padding:6px 0;color:#6b7280">Đơn giá</td><td style="font-weight:700;color:#b91c1c">${fmtVND(body.priceVnd)}</td></tr>` : ''}
              ${body.notes ? `<tr><td style="padding:6px 0;color:#6b7280">Ghi chú</td><td>${body.notes}</td></tr>` : ''}
            </table>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0"/>
            <a href="${APP_URL}/admin/products/${body.productId}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Xem sản phẩm trong admin →</a>
          </div>
        `,
      }).catch(() => {})
    }

    return apiSuccess({ orderRef }, 'Đặt hàng thành công', 201)
  } catch (err) {
    return handleApiError(err)
  }
}
