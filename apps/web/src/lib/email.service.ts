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

// Dòng "Hủy đăng ký" cho email marketing (KHÔNG dùng cho email giao dịch)
function unsubscribeNote(unsubscribeUrl: string): string {
  return `${divider()}
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6">
      Bạn nhận email này vì đã đăng ký tài khoản Japan VIP.<br/>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Hủy đăng ký nhận tin</a>
    </p>`
}

// ─── Welcome (chào mừng) ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: { email: string; fullName: string; unsubscribeUrl: string }) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, unsubscribeUrl } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `Chào mừng ${fullName} đến với Japan VIP! 🎌`,
    html: emailLayout(`
      <div style="text-align:center;margin-bottom:28px">
        <p style="margin:0 0 8px;font-size:44px;line-height:1">🎌</p>
        <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#111">Chào mừng bạn!</p>
        <p style="margin:0;font-size:14px;color:#6b7280">Xin chào <strong style="color:#111">${fullName}</strong>, cảm ơn bạn đã tham gia Japan VIP.</p>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
        Bạn vừa mở khóa cả thế giới hàng gia dụng nội địa Nhật Bản chính hãng. Đây là những gì bạn có thể làm ngay:
      </p>

      <div style="margin-bottom:24px">
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6">
          <span style="font-size:22px">🛍️</span>
          <div><p style="margin:0;font-size:14px;font-weight:700;color:#111">Mua hàng Nhật chính hãng</p><p style="margin:2px 0 0;font-size:13px;color:#6b7280">Mới 100%, nguyên hộp, tem nhập khẩu đầy đủ.</p></div>
        </div>
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6">
          <span style="font-size:22px">🔨</span>
          <div><p style="margin:0;font-size:14px;font-weight:700;color:#111">Săn đấu giá giá hời</p><p style="margin:2px 0 0;font-size:13px;color:#6b7280">Đấu giá minh bạch, real-time, giá tốt bất ngờ.</p></div>
        </div>
        <div style="display:flex;gap:12px;padding:12px 0">
          <span style="font-size:22px">📎</span>
          <div><p style="margin:0;font-size:14px;font-weight:700;color:#111">Mua hộ từ Amazon JP, Rakuten…</p><p style="margin:2px 0 0;font-size:13px;color:#6b7280">Dán link — nhận báo giá trọn gói trong 30 giây.</p></div>
        </div>
      </div>

      ${btn(`${APP_URL}`, 'Khám phá ngay →')}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
        Cần hỗ trợ?
        <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a>
        ·
        <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
      ${unsubscribeNote(unsubscribeUrl)}
    `),
  })
}

type MailProduct = { name: string; slug: string; image: string | null; price: number | null }
type MailAuction = { title: string; auctionId: string; image: string | null; currentPrice: number; endsAt: string }

function productGrid(products: MailProduct[], appUrl: string): string {
  if (products.length === 0) return ''
  const cells = products.slice(0, 4).map((p) => `
    <td width="50%" style="padding:6px" valign="top">
      <a href="${appUrl}/${p.slug}" style="display:block;text-decoration:none;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff">
        ${p.image ? `<img src="${p.image}" alt="" width="100%" style="display:block;width:100%;height:140px;object-fit:contain;background:#fff;padding:8px;box-sizing:border-box"/>` : `<div style="height:140px;background:#f3f4f6"></div>`}
        <div style="padding:10px 12px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111;line-height:1.4;height:36px;overflow:hidden">${p.name}</p>
          <p style="margin:0;font-size:14px;font-weight:800;color:#b91c1c">${p.price ? fmtVND(p.price) : 'Liên hệ'}</p>
        </div>
      </a>
    </td>`)
  // 2 cột/hàng
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>${cells[i] ?? ''}${cells[i + 1] ?? '<td width="50%"></td>'}</tr>`)
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px">${rows.join('')}</table>`
}

// ─── Bỏ giỏ hàng (abandoned cart) ────────────────────────────────────────────

type CartLine = { slug: string; name: string; image: string | null; priceVnd: number | null; quantity: number }

export async function sendAbandonedCartEmail(opts: { email: string; fullName: string; items: CartLine[]; unsubscribeUrl: string }) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, items, unsubscribeUrl } = opts

  const rows = items.slice(0, 6).map((it) => `
    <a href="${APP_URL}/${it.slug}" style="display:block;text-decoration:none;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;margin-bottom:10px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${it.image ? `<td width="72" valign="top"><img src="${it.image}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;background:#fff;padding:6px;box-sizing:border-box"/></td>` : ''}
        <td valign="middle" style="padding:10px 14px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111;line-height:1.4">${it.name}</p>
          <p style="margin:0;font-size:12px;color:#6b7280">SL: ${it.quantity}${it.priceVnd ? ` · <strong style="color:#b91c1c">${fmtVND(it.priceVnd)}</strong>` : ''}</p>
        </td>
      </tr></table>
    </a>`).join('')

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `Bạn để quên giỏ hàng tại Japan VIP 🛒`,
    html: emailLayout(`
      <div style="text-align:center;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:40px;line-height:1">🛒</p>
        <p style="margin:0 0 6px;font-size:21px;font-weight:900;color:#111">Giỏ hàng của bạn vẫn đang chờ!</p>
        <p style="margin:0;font-size:14px;color:#6b7280">Xin chào <strong style="color:#111">${fullName}</strong>, bạn còn sản phẩm chưa đặt. Hoàn tất ngay trước khi hết hàng nhé!</p>
      </div>
      ${rows}
      <div style="margin-top:20px">${btn(`${APP_URL}/gio-hang`, 'Hoàn tất đơn hàng →')}</div>
      ${divider()}
      <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
        Cần hỗ trợ đặt hàng? <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a> · <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
      ${unsubscribeNote(unsubscribeUrl)}
    `),
  })
}

// ─── Newsletter / Campaign (gửi hàng loạt) ───────────────────────────────────

export async function sendNewsletterEmail(opts: { email: string; fullName: string; subject: string; bodyHtml: string; unsubscribeUrl: string }) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, subject, bodyHtml, unsubscribeUrl } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject,
    html: emailLayout(`
      <p style="margin:0 0 16px;font-size:14px;color:#374151">Xin chào <strong style="color:#111">${fullName}</strong>,</p>
      <div style="font-size:14px;color:#374151;line-height:1.7">${bodyHtml}</div>
      <div style="margin-top:24px">${btn(`${APP_URL}`, 'Ghé Japan VIP →')}</div>
      ${unsubscribeNote(unsubscribeUrl)}
    `),
  })
}

// ─── Post-purchase (cảm ơn + hướng dẫn + cross-sell) ─────────────────────────

export async function sendPostPurchaseEmail(opts: {
  email: string
  fullName: string
  productName: string
  productSlug: string | null
  crossSell: MailProduct[]
  unsubscribeUrl?: string
}) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, productName, productSlug, crossSell, unsubscribeUrl } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `Cảm ơn bạn đã mua ${productName} 🎉`,
    html: emailLayout(`
      <div style="text-align:center;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:40px;line-height:1">🎉</p>
        <p style="margin:0 0 6px;font-size:21px;font-weight:900;color:#111">Cảm ơn ${fullName}!</p>
        <p style="margin:0;font-size:14px;color:#6b7280">Đơn hàng <strong style="color:#111">${productName}</strong> đã hoàn tất. Chúc bạn dùng sản phẩm thật ưng ý!</p>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:24px">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1e3a5f">📖 Hướng dẫn sử dụng</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">
          Xem thông số kỹ thuật & hướng dẫn dùng sản phẩm tại trang sản phẩm.
          ${productSlug ? `<br/><a href="${APP_URL}/${productSlug}" style="color:#b91c1c;font-weight:600;text-decoration:none">Xem hướng dẫn →</a>` : ''}
          Cần hỗ trợ lắp đặt/sử dụng, gọi <a href="tel:0988969896" style="color:#b91c1c;font-weight:600;text-decoration:none">0988.969.896</a>.
        </p>
      </div>

      ${crossSell.length > 0 ? `<p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Có thể bạn cũng thích</p>${productGrid(crossSell, APP_URL)}` : ''}

      <div style="margin-top:20px">${btn(`${APP_URL}`, 'Tiếp tục mua sắm →')}</div>
      ${divider()}
      <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
        Hài lòng với sản phẩm? Hãy để lại đánh giá hoặc giới thiệu bạn bè nhé!
      </p>
      ${unsubscribeUrl ? unsubscribeNote(unsubscribeUrl) : ''}
    `),
  })
}

// ─── Win-back (kéo khách quay lại) ───────────────────────────────────────────

export async function sendWinbackEmail(opts: { email: string; fullName: string; unsubscribeUrl: string; products: MailProduct[] }) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, unsubscribeUrl, products } = opts

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `Lâu rồi không gặp ${fullName}! Có gì mới ở Japan VIP? 🎁`,
    html: emailLayout(`
      <div style="text-align:center;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:40px;line-height:1">👋</p>
        <p style="margin:0 0 6px;font-size:21px;font-weight:900;color:#111">Lâu rồi không gặp bạn!</p>
        <p style="margin:0;font-size:14px;color:#6b7280">Xin chào <strong style="color:#111">${fullName}</strong>, Japan VIP có nhiều hàng nội địa Nhật mới về và phiên đấu giá hấp dẫn đang chờ bạn.</p>
      </div>
      ${products.length > 0 ? `<p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Gợi ý cho bạn</p>${productGrid(products, APP_URL)}` : ''}
      <div style="margin-top:20px">${btn(`${APP_URL}`, 'Khám phá hàng mới →')}</div>
      ${divider()}
      <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
        Cần tư vấn? <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a> · <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
      ${unsubscribeNote(unsubscribeUrl)}
    `),
  })
}

// ─── Digest "Hàng mới về" (định kỳ) ──────────────────────────────────────────

export async function sendDigestEmail(opts: { email: string; fullName: string; unsubscribeUrl: string; products: MailProduct[]; auctions: MailAuction[] }) {
  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'
  const { email, fullName, unsubscribeUrl, products, auctions } = opts

  const auctionRows = auctions.slice(0, 3).map((a) => `
    <a href="${APP_URL}/dau-gia/${a.auctionId}" style="display:block;text-decoration:none;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;margin-bottom:10px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${a.image ? `<td width="80" valign="top"><img src="${a.image}" alt="" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:cover"/></td>` : ''}
        <td valign="middle" style="padding:10px 14px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111;line-height:1.4">${a.title}</p>
          <p style="margin:0;font-size:12px;color:#6b7280">Giá hiện tại: <strong style="color:#b91c1c">${fmtVND(a.currentPrice)}</strong></p>
        </td>
      </tr></table>
    </a>`).join('')

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: email,
    subject: `🆕 Hàng mới về tuần này — Japan VIP`,
    html: emailLayout(`
      <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#111">Hàng mới về tuần này</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280">Xin chào <strong style="color:#111">${fullName}</strong>, đây là những sản phẩm Nhật mới nhất và phiên đấu giá đáng chú ý.</p>
      ${products.length > 0 ? `<p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">🆕 Sản phẩm mới</p>${productGrid(products, APP_URL)}` : ''}
      ${auctions.length > 0 ? `<div style="margin-top:20px"><p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">🔨 Đấu giá đang diễn ra</p>${auctionRows}</div>` : ''}
      <div style="margin-top:20px">${btn(`${APP_URL}`, 'Xem tất cả →')}</div>
      ${divider()}
      <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
        Hỗ trợ: <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a> · <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
      ${unsubscribeNote(unsubscribeUrl)}
    `),
  })
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

// ─── Cập nhật trạng thái đơn Mua Hộ ─────────────────────────────────────────

const BFJ_STATUS_EMAIL_CONFIG: Partial<Record<string, {
  subject: string
  headline: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  message: string
  showCta: boolean
}>> = {
  AWAITING_DEPOSIT: {
    subject: 'Yêu cầu đặt cọc để xác nhận đơn hàng',
    headline: 'Đơn hàng cần đặt cọc',
    icon: '💳',
    color: '#92400e',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    message: 'Japan VIP đã xem xét đơn và cần bạn hoàn tất đặt cọc để chúng tôi tiến hành đặt hàng tại Nhật Bản.',
    showCta: true,
  },
  DEPOSIT_RECEIVED: {
    subject: 'Đã nhận đặt cọc — Đơn đang được xử lý',
    headline: 'Đã nhận đặt cọc',
    icon: '✅',
    color: '#14532d',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    message: 'Japan VIP đã xác nhận khoản đặt cọc của bạn. Chúng tôi đang tiến hành đặt hàng tại Nhật Bản.',
    showCta: false,
  },
  ORDERING: {
    subject: 'Đơn hàng đang được đặt tại Nhật Bản',
    headline: 'Đang đặt hàng tại Nhật',
    icon: '🛒',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    message: 'Nhân viên Japan VIP đang tiến hành đặt hàng cho bạn tại Nhật Bản. Chúng tôi sẽ cập nhật khi hàng được xác nhận.',
    showCta: false,
  },
  ORDERED_FROM_JAPAN: {
    subject: 'Đã đặt hàng thành công tại Nhật Bản',
    headline: 'Đã đặt hàng tại Nhật',
    icon: '📦',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    message: 'Đơn hàng đã được đặt thành công tại Nhật Bản và đang chờ xử lý từ người bán. Thời gian về kho Nhật thường từ 3–7 ngày.',
    showCta: false,
  },
  IN_TRANSIT_JP: {
    subject: 'Hàng đang vận chuyển trong nội địa Nhật Bản',
    headline: 'Đang vận chuyển tại Nhật',
    icon: '🚚',
    color: '#4c1d95',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    message: 'Kiện hàng đang được vận chuyển đến kho Japan VIP tại Nhật Bản. Sau khi tập kết, hàng sẽ được gửi về Việt Nam.',
    showCta: false,
  },
  CUSTOMS_CLEARANCE: {
    subject: 'Hàng đang làm thủ tục hải quan',
    headline: 'Đang làm thủ tục hải quan',
    icon: '🛃',
    color: '#4c1d95',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    message: 'Kiện hàng đang được thông quan tại cửa khẩu. Quá trình này thường mất 1–3 ngày làm việc.',
    showCta: false,
  },
  IN_TRANSIT_VN: {
    subject: 'Hàng đang vận chuyển về Việt Nam',
    headline: 'Đang vận chuyển về Việt Nam',
    icon: '✈️',
    color: '#4c1d95',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    message: 'Tuyệt vời! Hàng đã thông quan và đang trên đường về Việt Nam. Chúng tôi sẽ liên hệ khi có mã vận đơn nội địa.',
    showCta: false,
  },
  DELIVERED: {
    subject: 'Đơn hàng đã được giao thành công',
    headline: 'Giao hàng thành công',
    icon: '🎉',
    color: '#14532d',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    message: 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã tin tưởng Japan VIP!',
    showCta: false,
  },
  CANCELLED: {
    subject: 'Đơn hàng đã bị huỷ',
    headline: 'Đơn hàng đã bị huỷ',
    icon: '❌',
    color: '#7f1d1d',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    message: 'Rất tiếc, đơn hàng của bạn đã bị huỷ. Vui lòng liên hệ Japan VIP để biết thêm chi tiết hoặc để tạo đơn mới.',
    showCta: false,
  },
  REFUNDED: {
    subject: 'Hoàn tiền đặt cọc thành công',
    headline: 'Đã hoàn tiền',
    icon: '💰',
    color: '#374151',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    message: 'Khoản đặt cọc đã được hoàn lại vào ví Japan VIP của bạn. Bạn có thể rút tiền hoặc sử dụng cho đơn hàng tiếp theo.',
    showCta: false,
  },
}

export async function sendBfjStatusEmail(opts: {
  email: string
  fullName: string
  orderNumber: string
  orderId: string
  status: string
  adminNotes?: string | null
  trackingVn?: string | null
}) {
  const config = BFJ_STATUS_EMAIL_CONFIG[opts.status]
  if (!config) return // không gửi email cho status không có config

  const cfg = await getSmtpConfig()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'

  const trackingSection = opts.trackingVn
    ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;color:#14532d;font-weight:600">📦 Mã vận đơn VN: <span style="font-family:monospace;font-size:14px">${opts.trackingVn}</span></p>
       </div>`
    : ''

  const notesSection = opts.adminNotes
    ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:20px">
        <p style="font-size:13px;color:#78350f;margin:0"><strong>Ghi chú từ Japan VIP:</strong> ${opts.adminNotes}</p>
       </div>`
    : ''

  const ctaSection = config.showCta
    ? `${divider()}${btn(`${APP_URL}/dashboard/orders`, 'Xem đơn hàng & Đặt cọc →')}`
    : `${divider()}${btn(`${APP_URL}/dashboard/orders`, 'Theo dõi đơn hàng →')}`

  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: opts.email,
    subject: `[Japan VIP] ${config.subject} — ${opts.orderNumber}`,
    html: emailLayout(`
      <!-- Status banner -->
      <div style="background:${config.bgColor};border:1.5px solid ${config.borderColor};border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 8px;font-size:36px;line-height:1">${config.icon}</p>
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${config.color}">${config.headline}</p>
        <p style="margin:0;font-size:12px;font-family:monospace;color:#9ca3af">Đơn hàng: ${opts.orderNumber}</p>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6">
        Xin chào <strong style="color:#111">${opts.fullName}</strong>,<br/>
        ${config.message}
      </p>

      ${trackingSection}
      ${notesSection}
      ${ctaSection}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Cần hỗ trợ?
        <a href="tel:0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">0988.969.896</a>
        ·
        <a href="https://zalo.me/0988969896" style="color:#b91c1c;text-decoration:none;font-weight:600">Chat Zalo</a>
      </p>
    `),
  })
}

export async function sendContentDoneEmail(opts: {
  title: string
  type: string
  viewUrl: string
}) {
  const typeLabel: Record<string, string> = {
    BLOG_POST: 'Bài Blog',
    PRODUCT_DESCRIPTION: 'Mô tả sản phẩm',
    FAQ: 'FAQ',
    SEO_META: 'SEO Meta',
  }
  const cfg = await getSmtpConfig()
  await createTransport(cfg).sendMail({
    from: cfg.from,
    to: 'admin@japanvip.vn',
    subject: `✅ Nội dung đã tạo xong: ${opts.title}`,
    html: emailLayout(`
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 8px;font-size:36px">✅</p>
        <p style="margin:0;font-size:18px;font-weight:800;color:#16a34a">Nội dung đã được tạo tự động!</p>
      </div>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">Loại: <strong>${typeLabel[opts.type] ?? opts.type}</strong></p>
      <p style="margin:0 0 24px;font-size:14px;color:#374151">Tiêu đề: <strong>${opts.title}</strong></p>
      <a href="${opts.viewUrl}" style="background:#b91c1c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px">
        Xem kết quả →
      </a>
    `),
  })
}
