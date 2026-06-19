'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, X, Menu } from 'lucide-react'
import { useState } from 'react'

type BlogCategory = { name: string; slug: string }

const BASE_NAV = [
  { label: 'Trang Chủ', href: '/' },
  {
    label: 'Mua Hàng Nhật',
    href: '/mua-ho',
    children: [
      { label: 'Đặt Mua Hộ', href: '/mua-ho' },
      { label: 'Nhập URL Sản Phẩm', href: '/mua-ho' },
      { label: 'Theo Dõi Đơn Hàng', href: '/theo-doi-don' },
      { label: 'Amazon Japan', href: '/mua-ho' },
      { label: 'Rakuten Japan', href: '/mua-ho' },
      { label: 'Mercari Japan', href: '/mua-ho' },
    ],
  },
  {
    label: 'Đấu Giá',
    href: '/dau-gia',
    children: [
      { label: 'Đang Diễn Ra', href: '/dau-gia' },
      { label: 'Sắp Diễn Ra', href: '/dau-gia?status=upcoming' },
      { label: 'Đã Kết Thúc', href: '/dau-gia?status=ended' },
    ],
  },
  { label: 'Theo Dõi Đơn', href: '/theo-doi-don' },
  { label: 'Liên Hệ', href: '/lien-he' },
]

function buildNav(blogCategories: BlogCategory[]) {
  const blogItem = {
    label: 'Bài Viết',
    href: '/blog',
    children: [
      { label: 'Tất cả bài viết', href: '/blog' },
      ...blogCategories.map((c) => ({ label: c.name, href: `/blog?cat=${c.slug}` })),
    ],
  }
  // Insert before "Theo Dõi Đơn"
  const nav = [...BASE_NAV]
  const idx = nav.findIndex((i) => i.href === '/theo-doi-don')
  nav.splice(idx, 0, blogItem)
  return nav
}

function useNavState() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null)
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  return { open, setOpen, expandedMobile, setExpandedMobile, isActive }
}

/* ── Desktop horizontal nav (hidden on mobile) ── */
export function NavLinks({ blogCategories = [] }: { blogCategories?: BlogCategory[] }) {
  const { isActive } = useNavState()
  const NAV_ITEMS = buildNav(blogCategories)

  return (
    <nav className="hidden md:flex h-10 items-center justify-center gap-0.5">
      {NAV_ITEMS.map((item) =>
        item.children ? (
          <div key={item.href} className="group relative">
            <Link
              href={item.href}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[15px] font-medium transition-all duration-200 border-b-2
                ${isActive(item.href)
                  ? 'border-white text-white'
                  : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
            >
              {item.label}
              <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-100" />
            </Link>
            <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
              <div className="mx-auto mb-[-1px] h-2 w-4 overflow-hidden flex justify-center">
                <div className="h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white shadow-sm" />
              </div>
              <div className="w-max min-w-[220px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
                {item.children.map((child, idx) => (
                  <Link
                    key={child.href + child.label}
                    href={child.href}
                    className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm text-gray-700 transition-all duration-150
                      hover:bg-red-50 hover:text-brand-red hover:pl-5
                      ${idx !== 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-[15px] font-medium transition-all duration-200 border-b-2
              ${isActive(item.href)
                ? 'border-white text-white'
                : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  )
}

/* ── Mobile: hamburger button + slide-in drawer ── */
export function MobileMenuButton({ blogCategories = [] }: { blogCategories?: BlogCategory[] }) {
  const { open, setOpen, expandedMobile, setExpandedMobile, isActive } = useNavState()
  const NAV_ITEMS = buildNav(blogCategories)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex h-10 w-10 items-center justify-center text-gray-700"
        aria-label="Mở menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 w-[280px] bg-white flex flex-col shadow-2xl" style={{ minHeight: 'min-content' }}>
            <div className="flex items-center justify-between px-4 py-4 bg-gray-900">
              <span className="text-white font-bold text-lg">Japan VIP</span>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white"
                aria-label="Đóng menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="py-2">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <div key={item.href}>
                    <button
                      onClick={() =>
                        setExpandedMobile(expandedMobile === item.href ? null : item.href)
                      }
                      className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          expandedMobile === item.href ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedMobile === item.href && (
                      <div className="bg-gray-50 border-t border-b border-gray-100">
                        {item.children.map((child) => (
                          <Link
                            key={child.href + child.label}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-brand-red hover:bg-red-50 transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-5 py-3.5 text-sm font-semibold transition-colors
                      ${isActive(item.href)
                        ? 'text-brand-red bg-red-50 border-l-4 border-brand-red'
                        : 'text-gray-800 hover:bg-gray-50'}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500 space-y-1">
              <p>
                Hotline:{' '}
                <a href="tel:0988969896" className="font-semibold text-brand-red">
                  0988.969.896
                </a>
              </p>
              <p>Thứ 2 – Thứ 7: 8:00 – 18:30</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
