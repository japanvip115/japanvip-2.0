import { prisma } from '@japanvip/db'

export type TemplateKey =
  | 'welcome' | 'otp' | 'quote_request' | 'bid_confirmation'
  | 'auction_outbid' | 'auction_win' | 'bfj_status' | 'post_purchase'

type Ph = { key: string; desc: string }

export const TEMPLATE_META: Record<TemplateKey, { icon: string; title: string; placeholders: Ph[]; required: string[] }> = {
  welcome: {
    icon: '👋', title: 'Chào mừng (sau xác minh)',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'unsubscribe', desc: 'Link hủy đăng ký' }],
    required: [],
  },
  otp: {
    icon: '🔐', title: 'Mã OTP xác thực',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'code', desc: 'Mã 6 số' }],
    required: ['code'],
  },
  quote_request: {
    icon: '📝', title: 'Tiếp nhận yêu cầu báo giá',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'tenSP', desc: 'Tên sản phẩm' }, { key: 'link', desc: 'Link sản phẩm gốc' }],
    required: [],
  },
  bid_confirmation: {
    icon: '🔨', title: 'Xác nhận đặt giá',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'tieuDe', desc: 'Tên phiên' }, { key: 'giaDat', desc: 'Giá bạn đặt' }, { key: 'giaHienTai', desc: 'Giá hiện tại' }, { key: 'ketThuc', desc: 'Thời gian kết thúc' }, { key: 'link', desc: 'Link phiên đấu giá' }],
    required: [],
  },
  auction_outbid: {
    icon: '⚡', title: 'Bị vượt giá',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'tieuDe', desc: 'Tên phiên' }, { key: 'giaMoi', desc: 'Giá mới nhất' }, { key: 'giaCuaBan', desc: 'Giá của bạn' }, { key: 'link', desc: 'Link phiên đấu giá' }],
    required: [],
  },
  auction_win: {
    icon: '🏆', title: 'Thắng đấu giá',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'tieuDe', desc: 'Tên phiên' }, { key: 'giaThang', desc: 'Giá trúng' }, { key: 'tongTien', desc: 'Tổng thanh toán' }, { key: 'link', desc: 'Link thanh toán' }],
    required: [],
  },
  bfj_status: {
    icon: '📦', title: 'Cập nhật trạng thái đơn (Mua hộ)',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'maDon', desc: 'Mã đơn' }, { key: 'tieuDe', desc: 'Tiêu đề trạng thái' }, { key: 'noiDung', desc: 'Mô tả trạng thái' }, { key: 'tracking', desc: 'Mã vận đơn VN' }, { key: 'link', desc: 'Link theo dõi đơn' }],
    required: [],
  },
  post_purchase: {
    icon: '🎉', title: 'Sau mua hàng',
    placeholders: [{ key: 'ten', desc: 'Tên khách' }, { key: 'tenSP', desc: 'Tên sản phẩm đã mua' }, { key: 'link', desc: 'Link sản phẩm' }, { key: 'unsubscribe', desc: 'Link hủy đăng ký' }],
    required: [],
  },
}

export function fillVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (m, k: string) => {
    const key = k.toLowerCase() === 'name' ? 'ten' : k
    return vars[key] ?? vars[k] ?? ''
  })
}

// Trả template tùy biến nếu BẬT và hợp lệ; null = dùng mẫu mặc định trong code.
export async function renderCustom(
  key: TemplateKey,
  vars: Record<string, string>,
): Promise<{ html: string; subject?: string } | null> {
  let row
  try {
    row = await prisma.emailTemplate.findUnique({ where: { key } })
  } catch {
    return null
  }
  if (!row || !row.enabled || !row.html?.trim()) return null

  // An toàn: thiếu placeholder bắt buộc → bỏ qua template tùy biến
  for (const r of TEMPLATE_META[key].required) {
    if (!new RegExp(`\\{\\{\\s*${r}\\s*\\}\\}`).test(row.html)) return null
  }

  const html = fillVars(row.html, vars)
  const subject = row.subject?.trim() ? fillVars(row.subject, vars) : undefined
  return { html, subject }
}
