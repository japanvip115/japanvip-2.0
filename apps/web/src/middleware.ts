import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED: { pattern: RegExp; role: string }[] = [
  { pattern: /^\/dashboard/, role: 'CUSTOMER' },
  { pattern: /^\/partner/, role: 'PARTNER' },
  { pattern: /^\/admin/, role: 'ADMIN' },
  { pattern: /^\/api\/v1\/users/, role: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/bfj\/(?!parse-url|estimate)/, role: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/auctions\/[^/]+\/bids/, role: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/partner/, role: 'PARTNER' },
  { pattern: /^\/api\/v1\/admin/, role: 'ADMIN' },
]

const ROLE_LEVEL: Record<string, number> = {
  CUSTOMER: 1, PARTNER: 2, ADMIN: 3, SUPER_ADMIN: 4,
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Affiliate attribution: ?ref=CODE → lưu cookie 30 ngày (last-click).
  // Đơn hàng (quick/bfj) đọc cookie này để gán hoa hồng cho CTV.
  const refParam = req.nextUrl.searchParams.get('ref')
  const validRef = refParam && /^[A-Z0-9_-]{3,20}$/i.test(refParam) ? refParam.toUpperCase() : null

  for (const route of PROTECTED) {
    if (!route.pattern.test(pathname)) continue

    const secureCookie = process.env.NODE_ENV === 'production'
    const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token'
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
      cookieName,
      salt: cookieName,
    })

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const userLevel = ROLE_LEVEL[token.role as string] ?? 0
    const requiredLevel = ROLE_LEVEL[route.role] ?? 0

    if (userLevel < requiredLevel) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/403', req.url))
    }

    if (token.status === 'SUSPENDED') {
      return NextResponse.redirect(new URL('/suspended', req.url))
    }
  }

  const res = NextResponse.next()
  if (validRef) {
    res.cookies.set('ref', validRef, {
      maxAge: 60 * 60 * 24 * 30, // 30 ngày
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
  return res
}

export const config = {
  // Chạy trên mọi trang (để bắt ?ref= trên trang sản phẩm public) trừ asset tĩnh.
  // RBAC vẫn chỉ áp dụng cho các prefix trong PROTECTED nên public page không tốn getToken.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)',
  ],
}
