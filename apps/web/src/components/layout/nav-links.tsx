'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, X, Menu } from 'lucide-react'
import { useState } from 'react'

type BlogCategory = { name: string; slug: string }
type ProductCategory = { name: string; slug: string; children?: { name: string; slug: string }[] }

/* ── Mega dropdown: Mua Hàng Nhật ── */
function BuyMegaMenu() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
      <div className="mx-auto mb-[-1px] h-2 w-4 overflow-hidden flex justify-center">
        <div className="h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white shadow-sm" />
      </div>
      <div className="flex w-max gap-0 rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        {/* Col 1: Dịch Vụ + Promo card bên dưới */}
        <div className="flex flex-col px-6 py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Dịch Vụ</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/mua-ho" className="flex items-center gap-2 py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">
              🛒 Đặt Mua Hộ
            </Link>
            <Link href="/mua-ho" className="flex items-center gap-2 py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">
              🔗 Nhập URL Sản Phẩm
            </Link>
            <Link href="/theo-doi-don" className="flex items-center gap-2 py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">
              📦 Theo Dõi Đơn Hàng
            </Link>
          </div>
          {/* Promo card */}
          <div className="mt-4 rounded-xl bg-gray-900 px-4 py-4">
            <span className="inline-block rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide mb-2">HOT</span>
            <p className="text-xs text-gray-400 mb-0.5 whitespace-nowrap">Phí dịch vụ ưu đãi</p>
            <p className="text-sm font-bold text-white leading-tight whitespace-nowrap mb-3">Chỉ 5% / đơn hàng</p>
            <Link href="/mua-ho" className="inline-block w-full rounded-lg bg-brand-red px-4 py-1.5 text-xs font-bold text-white text-center hover:bg-red-600 transition-colors whitespace-nowrap">
              Xem Ngay
            </Link>
          </div>
        </div>

        {/* Col 2: Nguồn Hàng */}
        <div className="px-6 py-5 border-l border-gray-100">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Nguồn Hàng</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/mua-ho" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Amazon Japan</Link>
            <Link href="/mua-ho" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Rakuten Japan</Link>
            <Link href="/mua-ho" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Mercari Japan</Link>
            <Link href="/mua-ho" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Yahoo Shopping Japan</Link>
          </div>
        </div>

        {/* Col 3: Danh Mục Hot */}
        <div className="px-6 py-5 border-l border-gray-100">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Danh Mục Hot</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/danh-muc/noi-com-dien" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Nồi Cơm Điện Nhật</Link>
            <Link href="/danh-muc/may-loc-khi" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Lọc Không Khí</Link>
            <Link href="/danh-muc/bet-ve-sinh" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Bồn Vệ Sinh Thông Minh</Link>
            <Link href="/danh-muc/may-hut-bui" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Hút Bụi Robot</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mega dropdown: Đấu Giá ── */
function AuctionMegaMenu() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
      <div className="mx-auto mb-[-1px] h-2 w-4 overflow-hidden flex justify-center">
        <div className="h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white shadow-sm" />
      </div>
      <div className="flex w-max gap-0 rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        {/* Col 1: Gia Dụng */}
        <div className="px-6 py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Gia Dụng</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Nồi Cơm Điện</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Lọc Không Khí</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Lọc Nước</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Hút Bụi</Link>
          </div>
        </div>

        {/* Col 2: Nhà Bếp */}
        <div className="px-6 py-5 border-l border-gray-100">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Nhà Bếp</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Lò Vi Sóng</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Pha Cà Phê</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Máy Rửa Bát</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Nồi Chiên Không Dầu</Link>
          </div>
        </div>

        {/* Col 3: Tiện Ích */}
        <div className="px-6 py-5 border-l border-gray-100">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Tiện Ích</p>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="space-y-1">
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Bồn Vệ Sinh</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Quạt Điện</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Nhà Thông Minh</Link>
            <Link href="/dau-gia" className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">Ký Gửi Đối Tác</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Desktop horizontal nav ── */
export function NavLinks({ blogCategories = [], productCategories: _ = [] }: { blogCategories?: BlogCategory[]; productCategories?: ProductCategory[] }) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const simpleLinks = [
    { label: 'Theo Dõi Đơn', href: '/theo-doi-don' },
    { label: 'CTV', href: '/cong-tac-vien' },
    { label: 'Liên Hệ', href: '/lien-he' },
  ]

  const blogChildren = [
    { label: 'Tất cả bài viết', href: '/blog' },
    ...blogCategories.map((c) => ({ label: c.name, href: `/blog?cat=${c.slug}` })),
  ]

  const linkCls = (href: string) =>
    `rounded-md px-3 py-1.5 text-[15px] font-medium uppercase transition-all duration-200 border-b-2 whitespace-nowrap
    ${isActive(href) ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`

  const dropLinkCls = (href: string) =>
    `flex items-center gap-1 rounded-md px-3 py-1.5 text-[15px] font-medium uppercase transition-all duration-200 border-b-2 whitespace-nowrap
    ${isActive(href) ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`

  return (
    <nav className="hidden md:flex h-10 items-center justify-center gap-0.5">
      {/* Trang Chủ */}
      <Link href="/" className={linkCls('/')}>Trang Chủ</Link>

      {/* Mua Hàng Nhật — mega */}
      <div className="group relative">
        <Link href="/mua-ho" className={dropLinkCls('/mua-ho')}>
          Mua Hàng Nhật
          <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-100" />
        </Link>
        <BuyMegaMenu />
      </div>

      {/* Đấu Giá — mega */}
      <div className="group relative">
        <Link href="/dau-gia" className={dropLinkCls('/dau-gia')}>
          Đấu Giá
          <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-100" />
        </Link>
        <AuctionMegaMenu />
      </div>

      {/* Blog — simple dropdown */}
      {blogCategories.length > 0 ? (
        <div className="group relative">
          <Link href="/blog" className={dropLinkCls('/blog')}>
            Blog Nhật Bản
            <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-100" />
          </Link>
          <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
            <div className="mx-auto mb-[-1px] h-2 w-4 overflow-hidden flex justify-center">
              <div className="h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white shadow-sm" />
            </div>
            <div className="flex w-max gap-0 rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
              <div className="px-6 py-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-red whitespace-nowrap">Danh Mục Blog</p>
                <div className="h-px bg-gray-100 mb-3" />
                <div className="space-y-1">
                  {blogChildren.map((child) => (
                    <Link key={child.href + child.label} href={child.href}
                      className="block py-1.5 text-sm text-gray-700 hover:text-brand-red transition-colors whitespace-nowrap">
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Link href="/blog" className={linkCls('/blog')}>Blog Nhật Bản</Link>
      )}

      {/* Các link đơn */}
      {simpleLinks.map((item) => (
        <Link key={item.href} href={item.href} className={linkCls(item.href)}>{item.label}</Link>
      ))}
    </nav>
  )
}

/* ── Mobile: hamburger + slide-in drawer ── */
export function MobileMenuButton({ blogCategories = [], productCategories = [] }: { blogCategories?: BlogCategory[]; productCategories?: ProductCategory[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const mobileItems = [
    { label: '🏠 Trang Chủ', href: '/' },
    {
      label: '🛒 Mua Hàng Nhật', href: '/mua-ho',
      children: [
        { label: 'Đặt Mua Hộ', href: '/mua-ho' },
        { label: 'Nhập URL Sản Phẩm', href: '/mua-ho' },
        { label: 'Theo Dõi Đơn Hàng', href: '/theo-doi-don' },
        { label: 'Amazon Japan', href: '/mua-ho' },
        { label: 'Rakuten Japan', href: '/mua-ho' },
        { label: 'Mercari Japan', href: '/mua-ho' },
        { label: 'Yahoo Shopping Japan', href: '/mua-ho' },
        { label: 'Nồi Cơm Điện Nhật', href: '/danh-muc/noi-com-dien' },
        { label: 'Máy Lọc Không Khí', href: '/danh-muc/may-loc-khi' },
      ],
    },
    {
      label: '🔨 Đấu Giá', href: '/dau-gia',
      children: [
        { label: 'Đang Diễn Ra', href: '/dau-gia' },
        { label: 'Nồi Cơm Điện', href: '/dau-gia' },
        { label: 'Máy Lọc Không Khí', href: '/dau-gia' },
        { label: 'Máy Hút Bụi', href: '/dau-gia' },
      ],
    },
    { label: '📝 Blog Nhật Bản', href: '/blog' },
    { label: '📦 Theo Dõi Đơn', href: '/theo-doi-don' },
    { label: '🤝 CTV', href: '/cong-tac-vien' },
    { label: '📞 Liên Hệ', href: '/lien-he' },
  ]

  return (
    <>
      <button onClick={() => setOpen(true)} className="md:hidden flex h-10 w-10 items-center justify-center text-gray-700" aria-label="Mở menu">
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 w-[280px] bg-white flex flex-col shadow-2xl" style={{ minHeight: 'min-content' }}>
            <div className="flex items-center justify-between px-4 py-4 bg-gray-900">
              <span className="text-white font-bold text-lg">Japan VIP</span>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Đóng menu">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="py-2 overflow-y-auto">
              {mobileItems.map((item) =>
                'children' in item ? (
                  <div key={item.href}>
                    <button
                      onClick={() => setExpanded(expanded === item.href ? null : item.href)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold uppercase text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      {item.label}
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded === item.href ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded === item.href && (
                      <div className="bg-gray-50 border-t border-b border-gray-100">
                        {(item.children ?? []).map((child) => (
                          <Link key={child.href + child.label} href={child.href} onClick={() => setOpen(false)}
                            className="flex items-center pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-brand-red hover:bg-red-50 transition-colors">
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={`flex items-center px-5 py-3.5 text-sm font-semibold uppercase transition-colors
                      ${isActive(item.href) ? 'text-brand-red bg-red-50 border-l-4 border-brand-red' : 'text-gray-800 hover:bg-gray-50'}`}>
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500 space-y-1">
              <p>Hotline: <a href="tel:0988969896" className="font-semibold text-brand-red">0988.969.896</a></p>
              <p>Thứ 2 – Thứ 7: 8:00 – 18:30</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
