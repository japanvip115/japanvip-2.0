import Link from 'next/link'

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <nav className="mb-4 text-sm text-gray-400">
          <Link href="/" className="hover:text-brand-red">Trang chủ</Link> / <span>{title}</span>
        </nav>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">{title}</h1>
        {updated && <p className="mb-6 text-xs text-gray-400">Cập nhật: {updated}</p>}
        <div className="legal-content text-[15px] leading-relaxed text-gray-700">{children}</div>
      </div>
    </div>
  )
}
