import Link from 'next/link'
import Image from 'next/image'
import { CartButton } from '@/components/cart/cart-button'
import { CartSync } from '@/components/cart/cart-sync'
import { HeaderSearch } from '@/components/layout/header-search'
import { NavLinks, MobileMenuButton } from '@/components/layout/nav-links'
import { HeaderAuthActions } from '@/components/layout/header-auth-actions'
import { getNavData } from '@/lib/nav-data'

export async function Header() {
  const { logoUrl, blogCategories, productCategories } = await getNavData()

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ── Top bar ── */}
      <div className="bg-gray-900 text-gray-300 text-xs">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-8 items-center justify-between gap-4">
          <div className="hidden items-center gap-4 md:flex">
            <span className="flex items-center gap-1">🇯🇵 Cam kết hàng Nhật chính hãng</span>
            <span className="text-gray-600">|</span>
            <span>Thứ 2 – Thứ 7: 8:00–18:30</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span>Hotline: <a href="tel:0988969896" className="font-semibold text-white hover:text-gray-300">0988.969.896</a></span>
            <span className="text-gray-600">|</span>
            <Link href="/lien-he" className="hover:text-white transition-colors">Liên hệ</Link>
            <span className="text-gray-600">|</span>
            <span>🇻🇳 VI</span>
          </div>
        </div>
      </div>

      {/* ── Main header ── */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 md:h-20 items-center gap-3">
          {/* Logo — left */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Japan VIP"
                width={160}
                height={56}
                className="object-contain h-12 md:h-16 w-auto"
                priority
              />
            ) : (
              <span className="text-xl md:text-2xl font-bold text-brand-red">Japan VIP</span>
            )}
          </Link>

          {/* Search — center (desktop only) */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <HeaderSearch />
          </div>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* Actions — right */}
          <div className="flex items-center gap-2">
            <CartSync />
            <CartButton />
            <HeaderAuthActions />
            {/* Hamburger — mobile only */}
            <MobileMenuButton blogCategories={blogCategories} productCategories={productCategories} />
          </div>
        </div>
      </div>

      {/* ── Nav bar (desktop only) ── */}
      <div className="hidden md:block bg-gray-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <NavLinks blogCategories={blogCategories} productCategories={productCategories} />
        </div>
      </div>

      {/* ── Mobile search bar ── */}
      <div className="md:hidden bg-white border-b px-4 py-2">
        <HeaderSearch />
      </div>
    </header>
  )
}
