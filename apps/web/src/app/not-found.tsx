import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-black text-gray-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-gray-500">
          Trang bạn đang tìm không tồn tại hoặc đã bị xóa.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
