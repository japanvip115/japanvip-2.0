import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: '403 — Không có quyền truy cập' }

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-black text-gray-200">403</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-gray-500">
          Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark"
          >
            Về trang chủ
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
