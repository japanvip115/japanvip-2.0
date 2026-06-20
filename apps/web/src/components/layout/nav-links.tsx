'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, X, Menu } from 'lucide-react'
import { useState } from 'react'

type BlogCategory = { name: string; slug: string }
type ProductCategory = { name: string; slug: string; children?: { name: string; slug: string }[] }

type NavChild = { label: string; href: string }
type NavItem = { label: string; href: string; children?: NavChild[] }

const BASE_NAV: NavItem[] = [
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
  { label: 'CTV', href: '/cong-tac-vien' },
  { label: 'Liên Hệ', href: '/lien-he' },
]

function buildNav(blogCategories: BlogCategory[]) {
  const blogItem: NavItem = {
    label: 'Bài Viết',
    href: '/blog',
    children: [
      { label: 'Tất cả bài viết', href: '/blog' },
      ...blogCategories.map((c) => ({ label: c.name, href: `/blog?cat=${c.slug}` })),
    ],
  }
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

/* ── Nested dropdown cho Sản Phẩm (desktop) ── */
function ProductMegaMenu({ categories }: { categories: ProductCategory[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
      <div className="mx-auto mb-[-1px] h-2 w-4 overflow-hidden flex justify-center">
        <div className="h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white shadow-sm" />
      </div>
      <div className="w-max min-w-[220px] rounded-xl border border-gray-100 bg-white shadow-2xl">
        {/* Tất cả */}
        <Link
          href="/san-pham"
          className="flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-gray-800 transition-all duration-150 hover:bg-red-50 hover:text-brand-red hover:pl-5"
        >
          Tất cả sản phẩm
        </Link>
        {/* Danh mục với sub */}
        {categories.map((cat) =>
          cat.children && cat.children.length > 0 ? (
            <div key={cat.slug} className="group/sub relative border-t border-gray-50">
              <div className="flex items-center justify-between whitespace-nowrap px-4 py-2.5 text-sm text-gray-700 transition-all duration-150 hover:bg-red-50 hover:text-brand-red cursor-pointer">
                <Link href={`/san-pham?categorySlug=${cat.slug}`} className="flex-1">
                  {cat.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              </div>
              {/* Sub-menu xuất hiện bên phải */}
              <div className="pointer-events-none absolute left-full top-0 z-[60] w-max min-w-[200px] opacity-0 translate-x-1 transition-all duration-150 group-hover/sub:pointer-events-auto group-hover/sub:opacity-100 group-hover/sub:translate-x-0" style={{marginLeft: '1px'}}>
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
                  <Link
                    href={`/san-pham?categorySlug=${cat.slug}`}
                    className="flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-gray-800 transition-all hover:bg-red-50 hover:text-brand-red"
                  >
                    Tất cả {cat.name}
                  </Link>
                  {cat.children.map((child, i) => (
                    <Link
                      key={child.slug}
                      href={`/san-pham?categorySlug=${child.slug}`}
                      className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-red-50 hover:text-brand-red hover:pl-5 ${i >= 0 ? 'border-t border-gray-50' : ''}`}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={cat.slug}
              href={`/san-pham?categorySlug=${cat.slug}`}
              className="flex items-center gap-2 whitespace-nowrap border-t border-gray-50 px-4 py-2.5 text-sm text-gray-700 transition-all duration-150 hover:bg-red-50 hover:text-brand-red hover:pl-5"
            >
              {cat.name}
            </Link>
          )
        )}
      </div>
    </div>
  )
}

/* ── Desktop horizontal nav ── */
export function NavLinks({ blogCategories = [], productCategories = [] }: { blogCategories?: BlogCategory[]; productCategories?: ProductCategory[] }) {
  const { isActive } = useNavState()
  const NAV_ITEMS = buildNav(blogCategories)

  return (
    <nav className="hidden md:flex h-10 items-center justify-center gap-0.5">
      {/* Trang Chủ */}
      <Link
        href="/"
        className={`rounded-md px-3 py-1.5 text-[15px] font-medium transition-all duration-200 border-b-2
          ${isActive('/') ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
      >
        Trang Chủ
      </Link>

      {/* Sản Phẩm — nested dropdown */}
      <div className="group relative">
        <Link
          href="/san-pham"
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[15px] font-medium transition-all duration-200 border-b-2
            ${isActive('/san-pham') ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
        >
          Sản Phẩm
          <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-100" />
        </Link>
        <ProductMegaMenu categories={productCategories} />
      </div>

      {/* Các item còn lại (bỏ Trang Chủ vì đã render riêng) */}
      {NAV_ITEMS.filter((i) => i.href !== '/').map((item) =>
        item.children ? (
          <div key={item.href} className="group relative">
            <Link
              href={item.href}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[15px] font-medium transition-all duration-200 border-b-2
                ${isActive(item.href) ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
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
              ${isActive(item.href) ? 'border-white text-white' : 'border-transparent text-white/80 hover:text-white hover:border-white/60'}`}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  )
}

/* ── Mobile: hamburger button + slide-in drawer ── */
export function MobileMenuButton({ blogCategories = [], productCategories = [] }: { blogCategories?: BlogCategory[]; productCategories?: ProductCategory[] }) {
  const { open, setOpen, expandedMobile, setExpandedMobile, isActive } = useNavState()
  const NAV_ITEMS = buildNav(blogCategories)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)

  // Full nav with Sản Phẩm inserted
  const allItems: NavItem[] = [
    { label: 'Trang Chủ', href: '/' },
    { label: 'Sản Phẩm', href: '/san-pham', children: [
      { label: 'Tất cả sản phẩm', href: '/san-pham' },
      ...productCategories.map((c) => ({ label: c.name, href: `/san-pham?categorySlug=${c.slug}` })),
    ]},
    ...NAV_ITEMS.filter((i) => i.href !== '/'),
  ]

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
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 w-[280px] bg-white flex flex-col shadow-2xl" style={{ minHeight: 'min-content' }}>
            <div className="flex items-center justify-between px-4 py-4 bg-gray-900">
              <span className="text-white font-bold text-lg">Japan VIP</span>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Đóng menu">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="py-2">
              {allItems.map((item) =>
                item.children ? (
                  <div key={item.href}>
                    <button
                      onClick={() => setExpandedMobile(expandedMobile === item.href ? null : item.href)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      {item.label}
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedMobile === item.href ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedMobile === item.href && (
                      <div className="bg-gray-50 border-t border-b border-gray-100">
                        {item.children.map((child) => {
                          // Check if this child has sub-children (for product categories)
                          const prodCat = productCategories.find((p) => `/san-pham?categorySlug=${p.slug}` === child.href)
                          const hasSub = prodCat && prodCat.children && prodCat.children.length > 0
                          return hasSub ? (
                            <div key={child.href + child.label}>
                              <button
                                onClick={() => setExpandedSub(expandedSub === child.href ? null : child.href)}
                                className="flex w-full items-center justify-between pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-brand-red hover:bg-red-50 transition-colors"
                              >
                                {child.label}
                                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandedSub === child.href ? 'rotate-180' : ''}`} />
                              </button>
                              {expandedSub === child.href && prodCat?.children?.map((sub) => (
                                <Link
                                  key={sub.slug}
                                  href={`/san-pham?categorySlug=${sub.slug}`}
                                  onClick={() => setOpen(false)}
                                  className="flex items-center pl-12 pr-5 py-2.5 text-sm text-gray-500 hover:text-brand-red hover:bg-red-50 transition-colors"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <Link
                              key={child.href + child.label}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="flex items-center pl-8 pr-5 py-3 text-sm text-gray-600 hover:text-brand-red hover:bg-red-50 transition-colors"
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-5 py-3.5 text-sm font-semibold transition-colors
                      ${isActive(item.href) ? 'text-brand-red bg-red-50 border-l-4 border-brand-red' : 'text-gray-800 hover:bg-gray-50'}`}
                  >
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
