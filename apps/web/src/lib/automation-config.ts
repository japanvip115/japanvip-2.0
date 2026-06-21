import { prisma } from '@japanvip/db'

export type AutomationKey = 'welcome' | 'abandoned_cart' | 'post_purchase' | 'winback' | 'digest'

export type AutomationConfig = {
  hours?: number      // abandoned_cart: giờ trễ tối thiểu
  days?: number       // winback: số ngày ngưng hoạt động
  dayOfWeek?: number  // digest: 0=CN..6=T7 (4=T5)
}

type AutomationDef = { enabled: boolean; config: AutomationConfig }

// Giá trị mặc định khi chưa có dòng cấu hình trong DB
export const AUTOMATION_DEFAULTS: Record<AutomationKey, AutomationDef> = {
  welcome:        { enabled: true, config: {} },
  abandoned_cart: { enabled: true, config: { hours: 6 } },
  post_purchase:  { enabled: true, config: {} },
  winback:        { enabled: true, config: { days: 60 } },
  digest:         { enabled: true, config: { dayOfWeek: 4 } },
}

export const AUTOMATION_META: Record<AutomationKey, { icon: string; title: string; desc: string }> = {
  welcome:        { icon: '👋', title: 'Email chào mừng',     desc: 'Gửi ngay sau khi khách xác minh email' },
  abandoned_cart: { icon: '🛒', title: 'Nhắc bỏ giỏ hàng',    desc: 'Khách đăng nhập để quên giỏ → nhắc hoàn tất' },
  post_purchase:  { icon: '🎉', title: 'Sau mua hàng',        desc: 'Cảm ơn + hướng dẫn + gợi ý sản phẩm liên quan' },
  winback:        { icon: '🔁', title: 'Kéo khách quay lại',  desc: 'Khách lâu không mua → nhắc quay lại' },
  digest:         { icon: '📰', title: 'Hàng mới về (định kỳ)', desc: 'Tổng hợp sản phẩm mới + đấu giá hot' },
}

export async function getAutomation(key: AutomationKey): Promise<AutomationDef> {
  const def = AUTOMATION_DEFAULTS[key]
  try {
    const row = await prisma.emailAutomation.findUnique({ where: { key } })
    if (!row) return def
    return { enabled: row.enabled, config: { ...def.config, ...((row.config as AutomationConfig) ?? {}) } }
  } catch {
    return def
  }
}
