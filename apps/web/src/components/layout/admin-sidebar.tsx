'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, Gavel, Users, ShoppingBag,
  DollarSign, FileText, Settings, FolderOpen, Layers,
  ChevronRight, ShieldAlert, Ban, LogOut, ExternalLink,
  Home, ClipboardList,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { href: '/admin/orders', label: 'Đơn Mua Hộ', icon: ShoppingBag },
      { href: '/admin/quick-orders', label: 'Đặt Hàng Nhanh', icon: ClipboardList },
      { href: '/admin/auctions', label: 'Đấu Giá', icon: Gavel },
      { href: '/admin/finance', label: 'Tài Chính', icon: DollarSign },
      { href: '/admin/users', label: 'Người Dùng', icon: Users },
    ],
  },
  {
    label: 'Sản phẩm',
    items: [
      { href: '/admin/products', label: 'Sản Phẩm', icon: Package },
      { href: '/admin/categories', label: 'Danh Mục', icon: FolderOpen },
      { href: '/admin/brands', label: 'Thương Hiệu', icon: Layers },
    ],
  },
  {
    label: 'Nội dung & Cài đặt',
    items: [
      { href: '/admin/content', label: 'Nội Dung', icon: FileText },
      { href: '/admin/settings', label: 'Cài Đặt', icon: Settings, exact: true },
      { href: '/admin/settings/logo-templates', label: 'Logo Templates', icon: Layers, exact: true },
      { href: '/admin/settings/fraud', label: 'Chống Gian Lận', icon: ShieldAlert, exact: true },
      { href: '/admin/settings/blocked-ips', label: 'IP Bị Chặn', icon: Ban, exact: true },
    ],
  },
]

type AdminSidebarProps = {
  user: { name?: string | null; email?: string | null }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 flex-shrink-0">
            <span className="text-xs font-black text-white">J</span>
          </span>
          <span className="text-sm font-bold text-white tracking-wide">Japan VIP</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-red-600/15 text-red-400 ring-1 ring-inset ring-red-600/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      active ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active && <ChevronRight className="h-3 w-3 flex-shrink-0 text-red-500/50" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user info + actions */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="flex-1">Xem trang chủ</span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-600/20 text-xs font-bold text-red-400">
            {(user.name ?? user.email ?? 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">
              {user.name ?? 'Admin'}
            </p>
            <p className="truncate text-[10px] text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Đăng xuất"
            className="flex-shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-gray-800 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
