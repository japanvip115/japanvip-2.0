import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import nodemailer from 'nodemailer'
import { decryptIfNeeded } from '@/lib/encrypt'

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    let { host, port, secure, user, pass, from, to } = await req.json()
    if (!to) {
      return NextResponse.json({ success: false, error: 'Thiếu địa chỉ email nhận (to)' }, { status: 400 })
    }

    // If pass is masked (contains •), load real credentials from DB
    if (!pass || pass.includes('•')) {
      const setting = await prisma.bfjSetting.findUnique({ where: { id: 'default' } })
      if (!setting?.smtpHost || !setting?.smtpUser || !setting?.smtpPass) {
        return NextResponse.json({ success: false, error: 'Chưa cấu hình SMTP. Hãy điền đầy đủ thông tin và lưu trước.' }, { status: 400 })
      }
      host = setting.smtpHost
      port = setting.smtpPort
      secure = setting.smtpSecure
      user = setting.smtpUser
      pass = decryptIfNeeded(setting.smtpPass)
      from = from || setting.smtpFrom || `Japan VIP <${setting.smtpUser}>`
    }

    if (!host || !user || !pass) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin SMTP (host, user, pass)' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host,
      port: port ?? 465,
      secure: secure ?? true,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: from ?? `Japan VIP <${user}>`,
      to,
      subject: '✅ Test Email — Japan VIP SMTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#c0392b">Japan VIP — Test Email</h2>
          <p>Email này được gửi để xác nhận cấu hình SMTP hoạt động bình thường.</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:16px">
            <tr><td style="padding:6px 0;color:#666">SMTP Host</td><td style="padding:6px 0;font-weight:bold">${host}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Port</td><td style="padding:6px 0;font-weight:bold">${port}</td></tr>
            <tr><td style="padding:6px 0;color:#666">SSL/TLS</td><td style="padding:6px 0;font-weight:bold">${secure ? 'Bật' : 'Tắt'}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Gửi từ</td><td style="padding:6px 0;font-weight:bold">${from ?? user}</td></tr>
          </table>
          <p style="margin-top:24px;color:#888;font-size:12px">Japan VIP — Hàng gia dụng nội địa Nhật Bản</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: `Đã gửi email test tới ${to}` })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Gửi email thất bại',
    }, { status: 400 })
  }
}
