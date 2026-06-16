import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@japanvip/db'
import { hasRole } from '@/lib/auth-types'

type RouteConfig = {
  pattern: RegExp
  requiredRole: UserRole
}

const PROTECTED_ROUTES: RouteConfig[] = [
  { pattern: /^\/dashboard/, requiredRole: 'CUSTOMER' },
  { pattern: /^\/partner/, requiredRole: 'PARTNER' },
  { pattern: /^\/admin/, requiredRole: 'ADMIN' },
  { pattern: /^\/api\/v1\/users/, requiredRole: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/bfj/, requiredRole: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/auctions\/[^/]+\/bids/, requiredRole: 'CUSTOMER' },
  { pattern: /^\/api\/v1\/partner/, requiredRole: 'PARTNER' },
  { pattern: /^\/api\/v1\/admin/, requiredRole: 'ADMIN' },
]

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  for (const route of PROTECTED_ROUTES) {
    if (!route.pattern.test(pathname)) continue

    if (!session?.user) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const userRole = session.user.role as UserRole
    if (!hasRole(userRole, route.requiredRole)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/403', req.url))
    }

    if (session.user.status === 'SUSPENDED') {
      return NextResponse.redirect(new URL('/suspended', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/partner/:path*',
    '/admin/:path*',
    '/api/v1/:path*',
  ],
}
