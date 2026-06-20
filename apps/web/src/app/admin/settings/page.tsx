import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@japanvip/db'
import { ContentProtectionToggle } from '@/components/admin/content-protection-toggle'

export const metadata: Metadata = { title: 'Admin — Cài Đặt' }

type SettingItem = {
  href: string
  icon: string
  title: string
  desc: string
  badge?: string
  badgeColor?: string
}

const GROUPS: { title: string; icon: string; items: SettingItem[] }[] = [
  {
    title: 'Giao diện & Thương hiệu',
    icon: '🎨',
    items: [
      { href: '/admin/settings/logo',            icon: '🖼️', title: 'Logo & Thương Hiệu',      desc: 'Upload logo, chỉnh tên và tagline' },
      { href: '/admin/settings/typography',       icon: '🔤', title: 'Typography & Font',         desc: 'Chọn font chữ toàn trang' },
      { href: '/admin/settings/homepage',         icon: '🏠', title: 'Nội Dung Trang Chủ',        desc: 'Tiêu đề, mô tả, nút CTA trang chủ' },
      { href: '/admin/settings/products-banner',  icon: '🖼️', title: 'Banner Sản Phẩm',           desc: 'Banner đầu trang /san-pham' },
      { href: '/admin/settings/testimonials',     icon: '⭐', title: 'Đánh Giá Khách Hàng',      desc: 'Thêm, sửa, ẩn/hiện đánh giá trang chủ' },
      { href: '/admin/settings/logo-templates',   icon: '🎭', title: 'Logo Templates',             desc: 'Mẫu logo & watermark sản phẩm' },
    ],
  },
  {
    title: 'Vận hành & Kinh doanh',
    icon: '⚙️',
    items: [
      { href: '/admin/settings/exchange-rate',    icon: '💱', title: 'Tỷ Giá JPY/VND',           desc: 'Cập nhật tỷ giá yên Nhật' },
      { href: '/admin/settings/bfj',              icon: '🛒', title: 'Cài Đặt Mua Hộ',            desc: 'Phí dịch vụ, vận chuyển, SMTP' },
      { href: '/admin/settings/auction-fees',     icon: '🔨', title: 'Phí Đấu Giá',               desc: 'Phí dịch vụ và vận chuyển đấu giá' },
      { href: '/admin/affiliates',               icon: '🤝', title: 'Hoa Hồng CTV',               desc: 'Duyệt, quản lý và thanh toán hoa hồng cộng tác viên' },
      {
        href: '/admin/settings/payment',
        icon: '💳',
        title: 'Cổng Thanh Toán',
        desc: 'VietQR + VNPay — chuyển khoản & thẻ',
        badge: 'VietQR',
        badgeColor: 'green',
      },
    ],
  },
  {
    title: 'Nội dung & AI',
    icon: '✨',
    items: [
      { href: '/admin/content/ai-writer',         icon: '📝', title: 'AI Content Writer',          desc: 'Tạo mô tả, FAQ, SEO, blog bằng AI', badge: 'AI', badgeColor: 'purple' },
      { href: '/admin/content/calendar',          icon: '📅', title: 'Content Calendar',            desc: 'Lên lịch tạo nội dung AI tự động', badge: 'Mới', badgeColor: 'blue' },
      { href: '/admin/settings/ai-keys',          icon: '🔐', title: 'AI API Keys',                 desc: 'Claude, GPT, Gemini, Stability, RunwayML…' },
      { href: '/admin/settings/ai-style',         icon: '🎨', title: 'Style Content AI',            desc: 'Tone, cấu trúc HTML, FAQ, attributes cho AI' },
      { href: '/admin/settings/blog-scrape',      icon: '🧹', title: 'Lọc Nội Dung Blog',          desc: 'Tự xoá backlink, SĐT khi scrape bài ngoài' },
    ],
  },
  {
    title: 'Bảo mật & Truy cập',
    icon: '🔒',
    items: [
      { href: '/admin/settings/oauth',            icon: '🔑', title: 'Google OAuth',               desc: 'Client ID & Secret đăng nhập Google' },
      { href: '/admin/settings/fraud',            icon: '🛡️', title: 'Chống Gian Lận',             desc: '10 rule fraud, điểm số, ngưỡng khoá' },
      { href: '/admin/settings/blocked-ips',      icon: '🚫', title: 'IP Bị Chặn',                 desc: 'Danh sách IP bị chặn khỏi hệ thống' },
    ],
  },
]

const BADGE_STYLES: Record<string, string> = {
  green:  'bg-green-900/60 text-green-400 border border-green-700/50',
  blue:   'bg-blue-900/60 text-blue-400 border border-blue-700/50',
  purple: 'bg-purple-900/60 text-purple-400 border border-purple-700/50',
  red:    'bg-red-900/60 text-red-400 border border-red-700/50',
}

export default async function AdminSettingsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'content_protection_enabled' } })
  const isProtectionEnabled = setting?.value !== 'false'

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Cài Đặt Hệ Thống</h1>
        <p className="text-sm text-gray-400 mt-1">Cấu hình giao diện và vận hành</p>
      </div>

      {/* Quick toggles row */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden">
        <div className="border-b border-gray-700/50 px-5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">🔒 Bảo vệ nội dung</p>
        </div>
        <div className="px-5 py-3.5">
          <ContentProtectionToggle enabled={isProtectionEnabled} />
        </div>
      </div>

      {/* Setting groups */}
      {GROUPS.map(group => (
        <section key={group.title}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{group.icon}</span>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{group.title}</h2>
            <div className="flex-1 h-px bg-gray-800 ml-1" />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-gray-700/80 bg-gray-800/50 px-4 py-3.5 hover:border-red-700/70 hover:bg-gray-800 transition-all duration-150"
              >
                <span className="text-xl shrink-0 leading-none mt-0.5">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-100 group-hover:text-white transition-colors leading-snug">{item.title}</p>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${BADGE_STYLES[item.badgeColor ?? 'blue']}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 leading-snug">{item.desc}</p>
                </div>
                <span className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0 mt-1 text-xs">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
