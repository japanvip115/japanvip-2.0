import type { Metadata } from 'next'
import Link from 'next/link'

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
]

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cài Đặt Hệ Thống</h1>
        <p className="text-sm text-gray-400">Cấu hình giao diện và vận hành</p>
      </div>

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
