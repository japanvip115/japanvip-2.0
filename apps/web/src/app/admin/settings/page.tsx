import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@japanvip/db'
import { ContentProtectionToggle } from '@/components/admin/content-protection-toggle'

export const metadata: Metadata = { title: 'Admin — Cài Đặt' }

const SETTING_ITEMS = [
  {
    href: '/admin/settings/logo',
    icon: '🖼️',
    title: 'Logo & Thương Hiệu',
    desc: 'Upload logo, chỉnh tên và tagline hiển thị trên website',
  },
  {
    href: '/admin/settings/typography',
    icon: '🔤',
    title: 'Typography & Font',
    desc: 'Chọn font chữ hiển thị trên toàn trang web',
  },
  {
    href: '/admin/settings/exchange-rate',
    icon: '💱',
    title: 'Tỷ Giá JPY/VND',
    desc: 'Cập nhật tỷ giá yên Nhật để tính giá sản phẩm và phí dịch vụ',
  },
  {
    href: '/admin/settings/bfj',
    icon: '🛒',
    title: 'Cài Đặt Mua Hộ',
    desc: 'Phí dịch vụ, bảng cước vận chuyển, dịch thuật, cấu hình email SMTP',
  },
  {
    href: '/admin/settings/fraud',
    icon: '🛡️',
    title: 'Chống Gian Lận',
    desc: 'Bật/tắt 10 rule fraud, điều chỉnh điểm số và ngưỡng tự động khóa',
  },
  {
    href: '/admin/settings/blocked-ips',
    icon: '🚫',
    title: 'IP Bị Chặn',
    desc: 'Quản lý danh sách IP bị chặn khỏi hệ thống đấu giá',
  },
  {
    href: '/admin/settings/oauth',
    icon: '🔑',
    title: 'Google OAuth',
    desc: 'Cài đặt Client ID và Client Secret cho tính năng đăng nhập bằng Google',
  },
  {
    href: '/admin/settings/homepage',
    icon: '🏠',
    title: 'Nội Dung Trang Chủ',
    desc: 'Chỉnh sửa tiêu đề, mô tả, nút CTA và các đoạn văn bản trên trang chủ',
  },
  {
    href: '/admin/settings/products-banner',
    icon: '🖼️',
    title: 'Banner Trang Sản Phẩm',
    desc: 'Ảnh banner hiển thị đầu trang /san-pham khi xem tất cả sản phẩm',
  },
  {
    href: '/admin/settings/auction-fees',
    icon: '🔨',
    title: 'Phí Đấu Giá',
    desc: 'Cài đặt phí dịch vụ (%) và phí vận chuyển ước tính hiển thị cho người mua',
  },
  {
    href: '/admin/settings/blog-scrape',
    icon: '🧹',
    title: 'Lọc Nội Dung Blog',
    desc: 'Tự động xóa backlink, số điện thoại, đoạn văn không mong muốn khi nhập bài từ URL',
  },
  {
    href: '/admin/settings/testimonials',
    icon: '⭐',
    title: 'Đánh Giá Khách Hàng',
    desc: 'Quản lý các đánh giá hiển thị trên trang chủ — thêm, sửa, ẩn/hiện, sắp xếp thứ tự',
  },
]

export default async function AdminSettingsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'content_protection_enabled' } })
  const isProtectionEnabled = setting?.value !== 'false'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Cài Đặt Hệ Thống</h1>
        <p className="text-sm text-gray-400">Cấu hình giao diện và vận hành</p>
      </div>

      {/* Quick toggles */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden">
        <div className="border-b border-gray-700 bg-gray-800 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Bảo vệ nội dung</p>
        </div>
        <div className="px-5 py-4">
          <ContentProtectionToggle enabled={isProtectionEnabled} />
        </div>
      </div>

      {/* Settings grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-2xl">
        {SETTING_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 hover:border-red-700 transition-colors"
          >
            <div className="text-3xl">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
