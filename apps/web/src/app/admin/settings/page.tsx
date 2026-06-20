import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@japanvip/db'
import { ContentProtectionToggle } from '@/components/admin/content-protection-toggle'

export const metadata: Metadata = { title: 'Admin — Cài Đặt' }

const GROUPS = [
  {
    title: 'Giao diện & Thương hiệu',
    icon: '🎨',
    items: [
      { href: '/admin/settings/logo',       icon: '🖼️', title: 'Logo & Thương Hiệu',     desc: 'Upload logo, chỉnh tên và tagline' },
      { href: '/admin/settings/typography', icon: '🔤', title: 'Typography & Font',        desc: 'Chọn font chữ toàn trang' },
      { href: '/admin/settings/homepage',   icon: '🏠', title: 'Nội Dung Trang Chủ',       desc: 'Tiêu đề, mô tả, nút CTA trang chủ' },
      { href: '/admin/settings/products-banner', icon: '🖼️', title: 'Banner Trang Sản Phẩm', desc: 'Banner đầu trang /san-pham' },
      { href: '/admin/settings/testimonials', icon: '⭐', title: 'Đánh Giá Khách Hàng',   desc: 'Thêm, sửa, ẩn/hiện đánh giá trang chủ' },
    ],
  },
  {
    title: 'Vận hành & Kinh doanh',
    icon: '⚙️',
    items: [
      { href: '/admin/settings/exchange-rate', icon: '💱', title: 'Tỷ Giá JPY/VND',     desc: 'Cập nhật tỷ giá yên Nhật' },
      { href: '/admin/settings/bfj',           icon: '🛒', title: 'Cài Đặt Mua Hộ',     desc: 'Phí dịch vụ, vận chuyển, SMTP' },
      { href: '/admin/settings/auction-fees',  icon: '🔨', title: 'Phí Đấu Giá',         desc: 'Phí dịch vụ và vận chuyển đấu giá' },
      { href: '/admin/settings/payment',       icon: '🏦', title: 'Cổng Thanh Toán',     desc: 'VNPay — TmnCode, HashSecret, IPN' },
    ],
  },
  {
    title: 'Bảo mật & Truy cập',
    icon: '🔒',
    items: [
      { href: '/admin/settings/oauth',       icon: '🔑', title: 'Google OAuth',    desc: 'Client ID & Secret đăng nhập Google' },
      { href: '/admin/settings/fraud',       icon: '🛡️', title: 'Chống Gian Lận',  desc: '10 rule fraud, điểm số, ngưỡng khoá' },
      { href: '/admin/settings/blocked-ips', icon: '🚫', title: 'IP Bị Chặn',      desc: 'Danh sách IP bị chặn khỏi hệ thống' },
    ],
  },
  {
    title: 'AI & Tích hợp',
    icon: '✨',
    items: [
      { href: '/admin/settings/ai-keys',    icon: '✨', title: 'AI API Keys',         desc: 'Claude, GPT, Gemini, Stability, RunwayML…' },
      { href: '/admin/settings/ai-style',   icon: '🎨', title: 'Style Content AI',    desc: 'Chỉnh tone, cấu trúc HTML, FAQ, attributes cho AI' },
      { href: '/admin/content/ai-writer',   icon: '📝', title: 'AI Content Writer',   desc: 'Tạo mô tả, FAQ, SEO, blog bằng AI' },
      { href: '/admin/settings/blog-scrape',icon: '🧹', title: 'Lọc Nội Dung Blog',   desc: 'Tự động xoá backlink, số điện thoại khi scrape' },
    ],
  },
]

export default async function AdminSettingsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'content_protection_enabled' } })
  const isProtectionEnabled = setting?.value !== 'false'

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Cài Đặt Hệ Thống</h1>
        <p className="text-sm text-gray-400 mt-1">Cấu hình giao diện và vận hành</p>
      </div>

      {/* Quick toggle */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 bg-gray-800 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">🔒 Bảo vệ nội dung</p>
        </div>
        <div className="px-5 py-4">
          <ContentProtectionToggle enabled={isProtectionEnabled} />
        </div>
      </div>

      {/* Grouped settings */}
      {GROUPS.map(group => (
        <div key={group.title}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{group.icon}</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{group.title}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-800/60 p-4 hover:border-red-700 hover:bg-gray-800 transition-all"
              >
                <span className="text-2xl shrink-0 leading-none mt-0.5">{item.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white group-hover:text-red-400 transition-colors leading-snug">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-snug">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
