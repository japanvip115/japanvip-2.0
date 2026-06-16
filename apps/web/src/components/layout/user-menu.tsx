'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

type Props = {
  name: string | null | undefined
  email: string | null | undefined
}

export function UserMenu({ name, email }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initial = ((name ?? email ?? 'U')[0] ?? 'U').toUpperCase()
  const displayName = name?.split(' ').pop() ?? email?.split('@')[0] ?? 'Tài khoản'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-red hover:text-brand-red transition-colors"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden sm:block">{displayName}</span>
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
          <div className="border-b px-4 py-2.5">
            <p className="text-xs font-semibold text-gray-800 truncate">{name ?? 'Tài khoản'}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>

          {[
            { href: '/dashboard', label: '👤 Tài khoản' },
            { href: '/dashboard/orders', label: '📦 Đơn hàng' },
            { href: '/dashboard/deposit', label: '💰 Đặt cọc đấu giá' },
            { href: '/dashboard/auctions', label: '🔨 Đấu giá' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-red transition-colors"
            >
              {label}
            </Link>
          ))}

          <div className="border-t mt-1 pt-1">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
