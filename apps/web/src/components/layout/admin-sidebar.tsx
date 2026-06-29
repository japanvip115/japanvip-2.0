'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, Gavel, Users, ShoppingBag,
  DollarSign, FileText, Settings, FolderOpen, Layers,
  ChevronRight, ChevronDown, ShieldAlert, Ban, LogOut, ExternalLink,
  Home, ClipboardList, Gift, Mail, Sparkles, Megaphone, Key, Wand2, BookOpen, BrainCircuit, Activity,
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
      { href: '/admin/affiliates', label: 'Hoa Hồng CTV', icon: Gift },
      { href: '/admin/referrals', label: 'Giới Thiệu Bạn Bè', icon: Sparkles },
      { href: '/admin/users', label: 'Người Dùng', icon: Users },
      { href: '/admin/subscribers', label: 'Subscriber Email', icon: Mail },
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
      { href: '/admin/ai', label: 'Tổng quan AI', icon: Sparkles, exact: true },
      { href: '/admin/content/ai-writer', label: 'AI Content Writer', icon: Sparkles },
      { href: '/admin/content/studio', label: 'Content Studio', icon: Wand2 },
      { href: '/admin/knowledge', label: 'Kho tri thức', icon: BookOpen },
      { href: '/admin/ai/products', label: 'Sản phẩm AI', icon: BrainCircuit },
      { href: '/admin/content/facebook', label: 'Bài đăng Facebook', icon: Megaphone },
      { href: '/admin/content', label: 'Nội Dung', icon: FileText },
      {
        href: '/admin/settings', label: 'Cài Đặt', icon: Settings, exact: true,
        children: [
          { href: '/admin/performance', label: 'Hiệu Năng (CWV)', icon: Activity, exact: true },
          { href: '/admin/settings/api-keys', label: 'API Keys', icon: Key, exact: true },
          { href: '/admin/settings/facebook', label: 'Facebook Marketing', icon: Megaphone, exact: true },
          { href: '/admin/settings/logo-templates', label: 'Logo Templates', icon: Layers, exact: true },
          { href: '/admin/settings/fraud', label: 'Chống Gian Lận', icon: ShieldAlert, exact: true },
          { href: '/admin/settings/blocked-ips', label: 'IP Bị Chặn', icon: Ban, exact: true },
        ],
      },
    ],
  },
]

// Sections ẩn với EDITOR (chỉ viết nội dung)
const EDITOR_HIDDEN_SECTIONS = new Set(['Kinh doanh', 'Tổng quan'])
const EDITOR_HIDDEN_ITEMS = new Set([
  '/admin/products', '/admin/categories', '/admin/brands',
  '/admin/settings',
])

type AdminSidebarProps = {
  user: { name?: string | null; email?: string | null; role?: string }
  counts?: Record<string, number>
}

export function AdminSidebar({ user, counts = {} }: AdminSidebarProps) {
  const isEditor = user.role === 'EDITOR'
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [ready, setReady] = useState(false)

  // Restore collapsed state from localStorage (avoid hydration flash)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin-sidebar-collapsed')
      if (saved) setCollapsed(JSON.parse(saved))
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  function toggleSection(label: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try { localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const [openParents, setOpenParents] = useState<Record<string, boolean>>({})
  function toggleParent(href: string) {
    setOpenParents((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  // Total pending across business items — shown on collapsed "Kinh doanh" header
  const sectionPending = (section: (typeof NAV_SECTIONS)[number]) =>
    section.items.reduce((sum, i) => sum + (counts[i.href] ?? 0), 0)

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 flex-shrink-0 shadow-lg shadow-red-600/20">
            <span className="text-xs font-black text-white">J</span>
          </span>
          <span className="text-sm font-bold text-white tracking-wide">Japan VIP</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_SECTIONS.filter(s => !isEditor || !EDITOR_HIDDEN_SECTIONS.has(s.label)).map((section) => {
          const isCollapsed = ready && collapsed[section.label]
          const pending = sectionPending(section)
          return (
            <div key={section.label} className="mb-3">
              <button
                onClick={() => toggleSection(section.label)}
                className="group/header flex w-full items-center gap-1.5 rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600 transition-colors hover:text-gray-400"
              >
                <ChevronDown
                  className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                />
                <span className="flex-1 text-left">{section.label}</span>
                {isCollapsed && pending > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {pending > 99 ? '99+' : pending}
                  </span>
                )}
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0' : 'mt-0.5 max-h-[600px]'}`}>
                {section.items.filter(item => !isEditor || !EDITOR_HIDDEN_ITEMS.has(item.href)).map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                  const badge = counts[item.href] ?? 0
                  const children = (item as any).children as typeof section.items | undefined
                  const childActive = children?.some((c) => pathname.startsWith(c.href)) ?? false
                  const parentActive = pathname === item.href || childActive
                  const open = openParents[item.href] ?? childActive

                  if (children) {
                    return (
                      <div key={item.href}>
                        <div
                          className={`group mb-0.5 flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                            parentActive ? 'bg-red-600/15 text-red-400 ring-1 ring-inset ring-red-600/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          }`}
                        >
                          <Link href={item.href} className="flex flex-1 items-center gap-2.5 py-2 pl-3 pr-1">
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${parentActive ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                            <span className="flex-1 truncate">{item.label}</span>
                          </Link>
                          <button
                            onClick={(e) => { e.preventDefault(); toggleParent(item.href) }}
                            aria-label="Mở rộng"
                            className="flex h-full items-center px-2.5 py-2 text-gray-500 hover:text-gray-300"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                          </button>
                        </div>
                        <div className={`overflow-hidden transition-all duration-200 ${open ? 'mb-1 max-h-72' : 'max-h-0'}`}>
                          <div className="ml-4 border-l border-gray-800 pl-2">
                            {children.map((c) => {
                              const cActive = c.exact ? pathname === c.href : pathname.startsWith(c.href)
                              return (
                                <Link
                                  key={c.href}
                                  href={c.href}
                                  className={`group mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                                    cActive ? 'bg-red-600/15 text-red-400' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                                  }`}
                                >
                                  <c.icon className={`h-3.5 w-3.5 flex-shrink-0 ${cActive ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                  <span className="flex-1 truncate">{c.label}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  }

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
                      {badge > 0 && (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                            active ? 'bg-red-500 text-white' : 'bg-red-600/90 text-white'
                          }`}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                      {active && badge === 0 && <ChevronRight className="h-3 w-3 flex-shrink-0 text-red-500/50" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
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
