import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@japanvip/db'

const BASE = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

export async function Footer() {
  const logoRow = await prisma.siteSetting.findUnique({ where: { key: 'site_logo_url' } })
  const logoUrl = logoRow?.value ?? ''

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className={`${BASE} py-8 lg:py-12`}>

        {/* ── Desktop: grid ── */}
        <div className="hidden lg:grid grid-cols-[1.2fr_1fr_1fr_1fr_1.6fr_1.2fr] gap-6">
          {/* Brand */}
          <div className="space-y-4">
            <LogoBlock logoUrl={logoUrl} />
            <p className="text-sm text-gray-400 leading-relaxed">
              Nền tảng mua hàng Nhật Bản và đấu giá gia dụng cao cấp uy tín hàng đầu Việt Nam.
            </p>
          </div>
          <div>
            <FooterHeading>Dịch Vụ</FooterHeading>
            <FooterLinks links={[
              { href: '/mua-ho', label: 'Mua Hàng Nhật Bản' },
              { href: '/dau-gia', label: 'Đấu Giá Gia Dụng' },
              { href: '/dashboard/orders', label: 'Theo Dõi Đơn Hàng' },
              { href: '/mua-ho', label: 'Ký Gửi Bán Hàng' },
            ]} />
          </div>
          <div>
            <FooterHeading>Danh Mục Hot</FooterHeading>
            <FooterLinks links={[
              { href: '/san-pham?q=bep+tu', label: 'Bếp Từ' },
              { href: '/san-pham?q=noi+com+dien', label: 'Nồi Cơm Điện' },
              { href: '/san-pham?q=dien+lanh', label: 'Điện Lạnh' },
              { href: '/san-pham?q=may+giat', label: 'Máy Giặt' },
            ]} />
          </div>
          <div>
            <FooterHeading>Hỗ Trợ</FooterHeading>
            <FooterLinks links={[
              { href: '/blog', label: 'Bài Viết' },
              { href: '/lien-he', label: 'Liên Hệ' },
              { href: '/chinh-sach-doi-tra', label: 'Chính Sách Đổi Trả' },
              { href: '/chinh-sach-van-chuyen', label: 'Chính Sách Vận Chuyển' },
              { href: '/bao-mat', label: 'Bảo Mật Thông Tin' },
              { href: '/cong-tac-vien', label: '🤝 Cộng Tác Viên' },
            ]} />
          </div>
          <div>
            <FooterHeading>Liên Hệ</FooterHeading>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><a href="tel:0988969896" className="hover:text-white transition-colors">📞 0988.969.896</a></li>
              <li><a href="tel:0967868688" className="hover:text-white transition-colors">📞 09.678.68.688</a></li>
              <li><a href="mailto:info@japanvip.vn" className="hover:text-white transition-colors">✉️ info@japanvip.vn</a></li>
              <li className="whitespace-nowrap">📍 115 Đinh Tiên Hoàng, Hải Phòng</li>
            </ul>
            <div className="mt-4 flex flex-nowrap gap-2">
              <PayBadge>💳 VNPay</PayBadge>
              <PayBadge>🏦 ATM</PayBadge>
              <PayBadge>📱 MoMo</PayBadge>
            </div>
          </div>
          <div>
            <FooterHeading>Theo Dõi</FooterHeading>
            <SocialLinks />
          </div>
        </div>

        {/* ── Mobile: compact layout ── */}
        <div className="lg:hidden space-y-4">
          {/* Logo + social */}
          <div className="flex items-center justify-between">
            <LogoBlock logoUrl={logoUrl} />
            <div className="flex items-center gap-2">
              <a href="https://facebook.com/japanvip" target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">f</a>
              <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold">Z</a>
              <a href="https://youtube.com/c/JapanvipVn1" target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-xs">▶</a>
            </div>
          </div>

          {/* Quick links — 2 col grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-gray-800 pt-3 text-xs text-gray-400">
            <Link href="/dau-gia" className="py-1 hover:text-white transition-colors">Đấu Giá</Link>
            <Link href="/mua-ho" className="py-1 hover:text-white transition-colors">Mua Hàng Nhật</Link>
            <Link href="/san-pham" className="py-1 hover:text-white transition-colors">Sản Phẩm</Link>
            <Link href="/lien-he" className="py-1 hover:text-white transition-colors">Liên Hệ</Link>
            <Link href="/chinh-sach-doi-tra" className="py-1 hover:text-white transition-colors">Đổi Trả</Link>
            <Link href="/chinh-sach-van-chuyen" className="py-1 hover:text-white transition-colors">Vận Chuyển</Link>
            <Link href="/cong-tac-vien" className="py-1 hover:text-white transition-colors">🤝 Cộng Tác Viên</Link>
          </div>

          {/* Payment + contact badges */}
          <div className="flex flex-wrap gap-1.5 border-t border-gray-800 pt-3">
            <PayBadge>💳 VNPay</PayBadge>
            <PayBadge>🏦 ATM</PayBadge>
            <PayBadge>📱 MoMo</PayBadge>
            <a href="tel:0988969896" className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors">📞 0988.969.896</a>
            <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-sky-700 px-2.5 py-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">💬 Zalo</a>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className={`${BASE} py-3`}>
          <p className="text-center text-xs text-gray-500">© {new Date().getFullYear()} Japan VIP. Bản quyền thuộc về Japan VIP Vietnam.</p>
        </div>
      </div>
    </footer>
  )
}

function LogoBlock({ logoUrl }: { logoUrl: string }) {
  return (
    <Link href="/" className="inline-block">
      {logoUrl ? (
        <span className="inline-block rounded-lg bg-white px-3 py-1.5">
          <Image src={logoUrl} alt="Japan VIP" width={120} height={48} className="h-10 w-auto object-contain" />
        </span>
      ) : (
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-extrabold text-red-500 tracking-tight">JAPAN</span>
          <span className="text-2xl font-extrabold text-white tracking-tight">VIP</span>
        </div>
      )}
    </Link>
  )
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{children}</h4>
}

function FooterLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {links.map((l, i) => (
        <li key={i}><Link href={l.href} className="text-gray-400 hover:text-white transition-colors">{l.label}</Link></li>
      ))}
    </ul>
  )
}

function SocialLinks() {
  const socials = [
    {
      href: 'https://facebook.com/japanvip',
      label: 'Facebook',
      color: '#1877F2',
      shadow: '0 4px 14px rgba(24,119,242,0.5)',
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
      ),
    },
    {
      href: 'https://zalo.me/0988969896',
      label: 'Zalo',
      color: '#0068FF',
      shadow: '0 4px 14px rgba(0,104,255,0.5)',
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 16.218c-.195.33-.476.595-.813.77a2.29 2.29 0 01-1.09.272c-.47 0-.908-.13-1.295-.372l-3.97-2.513a.38.38 0 00-.41.005l-1.97 1.318a.38.38 0 01-.583-.322V8.624a.38.38 0 01.583-.322l1.97 1.318a.38.38 0 00.41.005l3.97-2.513c.387-.242.825-.372 1.295-.372.384 0 .752.094 1.09.272.337.175.618.44.813.77.196.332.3.71.3 1.1v5.237c0 .39-.104.768-.3 1.1z"/>
        </svg>
      ),
    },
    {
      href: 'https://youtube.com/c/JapanvipVn1',
      label: 'YouTube',
      color: '#FF0000',
      shadow: '0 4px 14px rgba(255,0,0,0.5)',
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
    },
  ]
  return (
    <div className="flex flex-col gap-2.5">
      {socials.map((s) => (
        <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
          className="group flex items-center gap-3 text-sm text-white transition-all duration-200 hover:-translate-y-0.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white opacity-50 transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 group-hover:shadow-[var(--social-glow)]"
            style={{ background: s.color, ['--social-glow' as string]: s.shadow }}>
            {s.icon}
          </span>
          <span className="text-gray-300 group-hover:text-white transition-colors">{s.label}</span>
        </a>
      ))}
    </div>
  )
}

function PayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400">{children}</span>
  )
}
