import nodemailer from 'nodemailer'
import { prisma } from '@japanvip/db'
import { decryptIfNeeded } from '@/lib/encrypt'

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const setting = await prisma.bfjSetting.findUnique({ where: { id: 'default' } })
    if (setting?.smtpHost && setting?.smtpUser && setting?.smtpPass) {
      return {
        host: setting.smtpHost,
        port: setting.smtpPort,
        secure: setting.smtpSecure,
        user: setting.smtpUser,
        pass: decryptIfNeeded(setting.smtpPass) ?? '',
        from: setting.smtpFrom ?? `Japan VIP <${setting.smtpUser}>`,
      }
    }
  } catch {}

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    throw new Error('Chưa cấu hình SMTP. Vào Admin → Cài Đặt Mua Hộ → Email SMTP để thiết lập.')
  }
  const port = parseInt(process.env.SMTP_PORT ?? '465', 10)
  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from: process.env.SMTP_FROM ?? `Japan VIP <${user}>`,
  }
}

function createTransport(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })
}

const fmtVND = (n: number) => n.toLocaleString('vi-VN') + '&#8363;'

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:#b91c1c;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
            <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">Japan</span><span style="font-size:26px;font-weight:300;color:#fca5a5;letter-spacing:-0.5px">VIP</span>
            <p style="margin:4px 0 0;font-size:11px;color:#fca5a5;letter-spacing:1.5px;text-transform:uppercase">Hàng nội địa Nhật Bản chính hãng</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280">
              <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a>
              &nbsp;·&nbsp;
              <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
              &nbsp;·&nbsp;
              <a href="mailto:info@japanvip.vn" style="color:#b91c1c;text-decoration:none;font-weight:600">info@japanvip.vn</a>
            </p>
            <p style="margin:0;font-size:11px;color:#9ca3af">Hỗ trợ 08:00–18:30 hằng ngày &nbsp;|&nbsp; 115 Đinh Tiên Hoàng, Hải Phòng</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function divider(): string {
  return `<div style="border-top:1px solid #f3f4f6;margin:24px 0"></div>`
}

function btn(href: string, text: string, style: 'primary' | 'outline' = 'primary'): string {
  if (style === 'outline') {
    return `<a href="${href}" style="display:inline-block;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;color:#b91c1c;border:1.5px solid #b91c1c;background:#fff">${text}</a>`
  }
  return `<a href="${href}" style="display:block;text-align:center;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;color:#fff;background:#b91c1c">${text}</a>`
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export async function sendOtpEmail(email: string, code: string, fullName?: string) {
  const cfg = await getSmtpConfig()
  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `[Japan VIP] Mã xác thực: ${code}`,
    html: emailLayout(`
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111">Xác thực tài khoản</p>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280">
        Xin chào${fullName ? ` <strong style="color:#111">${fullName}</strong>` : ''},<br/>
        Sử dụng mã bên dưới để hoàn tất xác thực. Mã có hiệu lực trong <strong>10 phút</strong>.
      </p>
      <div style="background:#fef2f2;border:1.5px dashed #fca5a5;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ef4444">Mã xác thực của bạn</p>
        <span style="font-size:42px;font-weight:900;letter-spacing:14px;color:#b91c1c;font-family:monospace">${code}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
      </p>
    `),
  })
}

// ─── Báo giá mua hộ ──────────────────────────────────────────────────────────

export async function sendQuoteRequestEmail(opts: {
  email: string
  fullName: string
  productName: string
  productImage?: string | null
  productModel?: string | null
  sourceUrl: string
  notes?: string | null
}) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, productName, productImage, productModel, sourceUrl, notes } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `[Japan VIP] Yêu cầu báo giá đã được tiếp nhận`,
    html: emailLayout(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111">Yêu cầu đã được ghi nhận</p>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280">
        Xin chào <strong style="color:#111">${fullName}</strong>,<br/>
        Tư vấn viên Japan VIP sẽ liên hệ với bạn trong giờ hành chính (8:00–18:30 hằng ngày).
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:20px">
        ${productImage ? `<img src="${productImage}" alt="" style="width:72px;height:72px;object-fit:contain;float:left;margin:0 14px 8px 0;border-radius:8px;border:1px solid #e5e7eb;background:#fff"/>` : ''}
        <p style="margin:0 0 4px;font-weight:700;font-size:14px;color:#111">${productName}</p>
        ${productModel ? `<p style="margin:0 0 6px;font-family:monospace;font-size:12px;color:#9ca3af">Model: ${productModel}</p>` : ''}
        <a href="${sourceUrl}" style="font-size:12px;color:#b91c1c;text-decoration:none;font-weight:600">Xem sản phẩm gốc →</a>
        <div style="clear:both"></div>
      </div>

      ${notes ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:20px"><p style="font-size:13px;color:#78350f;margin:0"><strong>Ghi chú của bạn:</strong> ${notes}</p></div>` : ''}

      ${divider()}
      <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#374151">Liên hệ tư vấn trực tiếp:</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px">${btn('https://zalo.me/0988969896', '💬 Chat Zalo')}</td>
        <td>${btn('tel:0988969896', '📞 Gọi ngay', 'outline')}</td>
      </tr></table>
      ${divider()}

      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Quản lý đơn: <a href="${APP_URL}/dashboard/orders" style="color:#b91c1c">${APP_URL}/dashboard/orders</a>
      </p>
    `),
  })
}

// ─── Xác nhận đặt giá ────────────────────────────────────────────────────────

export async function sendBidConfirmationEmail(opts: {
  email: string
  fullName: string
  auctionTitle: string
  auctionId: string
  bidAmount: number
  currentPrice: number
  endsAt: string
}) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, auctionTitle, auctionId, bidAmount, currentPrice, endsAt } = opts
  const endDate = new Date(endsAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `[Japan VIP] Đặt giá thành công — ${fmtVND(bidAmount)}`,
    html: emailLayout(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111">Đặt giá thành công</p>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280">
        Xin chào <strong style="color:#111">${fullName}</strong>, bạn đang dẫn đầu phiên đấu giá này.
      </p>

      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a">Giá bạn đặt</p>
        <p style="margin:0;font-size:36px;font-weight:900;color:#15803d;line-height:1">${fmtVND(bidAmount)}</p>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px">
        <div style="padding:14px 18px;border-bottom:1px solid #e5e7eb">
          <p style="margin:0;font-weight:700;font-size:14px;color:#111">${auctionTitle}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">Giá hiện tại</td>
            <td style="padding:10px 18px;font-size:13px;font-weight:700;color:#b91c1c;text-align:right;border-bottom:1px solid #f3f4f6">${fmtVND(currentPrice)}</td>
          </tr>
          <tr>
            <td style="padding:10px 18px;font-size:13px;color:#6b7280">Thời gian kết thúc</td>
            <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#374151;text-align:right">${endDate}</td>
          </tr>
        </table>
      </div>

      ${btn(`${APP_URL}/dau-gia/${auctionId}`, 'Theo dõi phiên đấu giá →')}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Chúng tôi sẽ gửi thông báo ngay nếu bạn bị vượt giá.
      </p>
    `),
  })
}

// ─── Bị vượt giá ─────────────────────────────────────────────────────────────

export async function sendAuctionOutbidEmail(opts: {
  email: string
  fullName: string
  auctionTitle: string
  auctionId: string
  newPrice: number
  yourBid: number
}) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, auctionTitle, auctionId, newPrice, yourBid } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `[Japan VIP] Bạn vừa bị vượt giá — Đặt lại ngay!`,
    html: emailLayout(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111">Bạn vừa bị vượt giá</p>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280">
        Xin chào <strong style="color:#111">${fullName}</strong>,<br/>
        Có người vừa đặt giá cao hơn trong phiên: <strong style="color:#111">${auctionTitle}</strong>
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:28px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0">
              <p style="margin:0;font-size:12px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px">Giá mới nhất</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#b91c1c">${fmtVND(newPrice)}</p>
            </td>
            <td style="text-align:right;padding:6px 0">
              <p style="margin:0;font-size:12px;color:#9ca3af">Giá của bạn</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#6b7280;text-decoration:line-through">${fmtVND(yourBid)}</p>
            </td>
          </tr>
        </table>
      </div>

      ${btn(`${APP_URL}/dau-gia/${auctionId}`, '⚡ Đặt lại ngay để giành chiến thắng')}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Hành động nhanh trước khi phiên kết thúc!
      </p>
    `),
  })
}

// ─── Thắng đấu giá ───────────────────────────────────────────────────────────

export async function sendAuctionWinEmail(opts: {
  email: string
  fullName: string
  auctionTitle: string
  auctionId: string
  hammerPrice: number
  buyerPremium: number
  totalPayable: number
  settlementDueDays?: number
}) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, auctionTitle, auctionId, hammerPrice, buyerPremium, totalPayable, settlementDueDays = 3 } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `[Japan VIP] Chúc mừng! Bạn đã thắng — ${auctionTitle}`,
    html: emailLayout(`
      <!-- Trophy banner -->
      <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fcd34d;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
        <p style="margin:0 0 10px;font-size:48px;line-height:1">🏆</p>
        <p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#78350f">Chúc mừng ${fullName}!</p>
        <p style="margin:0;font-size:13px;color:#92400e">Bạn là người thắng phiên đấu giá này</p>
      </div>

      <!-- Auction title -->
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Sản phẩm</p>
      <p style="margin:0 0 24px;font-size:16px;font-weight:700;color:#111">${auctionTitle}</p>

      <!-- Price breakdown -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px">
        <div style="background:#f9fafb;padding:10px 18px;border-bottom:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280">Chi tiết thanh toán</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">Giá trúng</td>
            <td style="padding:12px 18px;font-size:13px;font-weight:600;color:#111;text-align:right;border-bottom:1px solid #f3f4f6">${fmtVND(hammerPrice)}</td>
          </tr>
          ${buyerPremium > 0 ? `
          <tr>
            <td style="padding:12px 18px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6">Phí mua (Buyer's Premium)</td>
            <td style="padding:12px 18px;font-size:13px;font-weight:600;color:#111;text-align:right;border-bottom:1px solid #f3f4f6">+ ${fmtVND(buyerPremium)}</td>
          </tr>` : ''}
          <tr style="background:#fef2f2">
            <td style="padding:14px 18px;font-size:14px;font-weight:700;color:#111">Tổng thanh toán</td>
            <td style="padding:14px 18px;font-size:18px;font-weight:900;color:#b91c1c;text-align:right">${fmtVND(totalPayable)}</td>
          </tr>
        </table>
      </div>

      <!-- Deadline warning -->
      <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:28px">
        <p style="margin:0;font-size:13px;color:#7c2d12;font-weight:600">
          ⏰ Hạn thanh toán: <strong>${settlementDueDays} ngày</strong> kể từ hôm nay
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#9a3412">Quá hạn có thể ảnh hưởng đến quyền tham gia phiên tiếp theo.</p>
      </div>

      ${btn(`${APP_URL}/dashboard/auctions`, 'Xem chi tiết & Thanh toán →')}

      ${divider()}
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-align:center">Cần hỗ trợ thanh toán?</p>
      <p style="margin:0;font-size:12px;text-align:center">
        <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a>
        &nbsp;·&nbsp;
        <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
    `),
  })
}

export async function testSmtpConnection(cfg: SmtpConfig): Promise<void> {
  const transporter = createTransport(cfg)
  await transporter.verify()
}
