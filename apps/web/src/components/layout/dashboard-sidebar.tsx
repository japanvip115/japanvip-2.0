'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Gavel, Wallet, Bell, LogOut, MapPin, Gift } from 'lucide-react'
import { signOut } from 'next-auth/react'
import type { SessionUser } from '@/lib/auth-types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tổng Quan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Đơn Hàng Mua Hộ', icon: Package },
  { href: '/dashboard/auctions', label: 'Đấu Giá', icon: Gavel },
  { href: '/dashboard/wallet', label: 'Ví Tiền', icon: Wallet },
  { href: '/dashboard/referral', label: 'Giới Thiệu Bạn Bè', icon: Gift },
  { href: '/dashboard/addresses', label: 'Địa Chỉ', icon: MapPin },
  { href: '/dashboard/notifications', label: 'Thông Báo', icon: Bell },
]

export function DashboardSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="border-b p-4">
        <Link href="/" className="text-xl font-bold text-brand-red">Japan VIP</Link>
      </div>

      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">{user.name ?? 'Khách hàng'}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>

      <nav className="flex-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-red-50 font-medium text-brand-red'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
