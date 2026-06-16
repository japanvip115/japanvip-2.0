'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Gavel, Users, ShoppingBag,
  DollarSign, FileText, Settings, FolderOpen, Layers,
  ChevronRight, ShieldAlert, Ban,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng Quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Đơn Mua Hộ', icon: ShoppingBag },
  { href: '/admin/products', label: 'Sản Phẩm', icon: Package },
  { href: '/admin/categories', label: 'Danh Mục', icon: FolderOpen },
  { href: '/admin/brands', label: 'Thương Hiệu', icon: Layers },
  { href: '/admin/auctions', label: 'Đấu Giá', icon: Gavel },
  { href: '/admin/users', label: 'Người Dùng', icon: Users },
  { href: '/admin/finance', label: 'Tài Chính', icon: DollarSign },
  { href: '/admin/content', label: 'Nội Dung', icon: FileText },
  { href: '/admin/settings/bfj', label: 'Cài Đặt Mua Hộ', icon: ShoppingBag, exact: true },
  { href: '/admin/settings/fraud', label: 'Chống Gian Lận', icon: ShieldAlert, exact: true },
  { href: '/admin/settings/blocked-ips', label: 'IP Bị Chặn', icon: Ban, exact: true },
  { href: '/admin/settings', label: 'Cài Đặt', icon: Settings, exact: true },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-800 px-5">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="h-6 w-6 rounded bg-red-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black text-white">J</span>
          </span>
          <span className="text-sm font-bold text-white tracking-wide">Japan VIP Admin</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-red-600/15 text-red-400 ring-1 ring-inset ring-red-600/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-red-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 text-red-500/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          Về trang chủ
        </Link>
      </div>
    </aside>
  )
}
