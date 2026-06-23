'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { UserMenu } from '@/components/layout/user-menu'
import { LoginDropdown } from '@/components/layout/login-dropdown'

// Phần đăng nhập/tài khoản — client-side (useSession) để Header render TĨNH.
export function HeaderAuthActions() {
  const { data: session } = useSession()
  const user = session?.user as { name?: string | null; email?: string } | undefined

  if (user) return <UserMenu name={user.name ?? null} email={user.email ?? ''} />

  return (
    <>
      <LoginDropdown />
      <Link
        href="/register"
        className="rounded-md bg-brand-red px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-red-dark transition-colors"
      >
        Đăng ký
      </Link>
    </>
  )
}
