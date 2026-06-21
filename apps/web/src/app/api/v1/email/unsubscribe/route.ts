import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'

function page(title: string, message: string, ok: boolean): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;width:100%;margin:16px;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <p style="font-size:46px;margin:0 0 12px">${ok ? '✅' : '⚠️'}</p>
    <h1 style="font-size:20px;font-weight:800;color:#111;margin:0 0 10px">${title}</h1>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px">${message}</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'}" style="display:inline-block;background:#b91c1c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Về Japan VIP</a>
  </div>
</body></html>`
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return page('Liên kết không hợp lệ', 'Thiếu mã hủy đăng ký.', false)

  const user = await prisma.user.findUnique({ where: { unsubscribeToken: token }, select: { id: true, marketingOptIn: true } })
  if (!user) return page('Liên kết không hợp lệ', 'Mã hủy đăng ký không tồn tại hoặc đã hết hạn.', false)

  if (user.marketingOptIn) {
    await prisma.user.update({ where: { id: user.id }, data: { marketingOptIn: false } })
  }

  return page('Đã hủy đăng ký', 'Bạn sẽ không nhận email marketing từ Japan VIP nữa. Các email giao dịch (đơn hàng, đấu giá) vẫn được gửi bình thường. Nếu đổi ý, hãy liên hệ chúng tôi để đăng ký lại.', true)
}
