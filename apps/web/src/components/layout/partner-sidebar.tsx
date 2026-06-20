'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Gavel, DollarSign, Gift, Link2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/partner', label: 'Tổng Quan', icon: LayoutDashboard, exact: true },
  { href: '/partner/products', label: 'Sản Phẩm', icon: Package },
  { href: '/partner/auctions', label: 'Phiên Đấu Giá', icon: Gavel },
  { href: '/partner/commissions', label: 'Hoa Hồng', icon: Gift },
  { href: '/partner/revenue', label: 'Doanh Thu', icon: DollarSign },
]

export function PartnerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="border-b p-4">
        <Link href="/" className="text-xl font-bold text-brand-red">Japan VIP Partner</Link>
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
    </aside>
  )
}
