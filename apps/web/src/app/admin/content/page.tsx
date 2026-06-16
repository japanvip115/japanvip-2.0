import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { FileText, ImageOff, Globe, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Nội Dung' }
export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const [postCount, bannerCount, seoCount, draftCount] = await Promise.all([
    prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.banner.count({ where: { isActive: true } }),
    prisma.seoPage.count(),
    prisma.blogPost.count({ where: { status: 'DRAFT' } }),
  ])

  const sections = [
    {
      href: '/admin/content/blog',
      icon: FileText,
      title: 'Blog & Bài Viết',
      desc: 'Quản lý bài viết, hướng dẫn, tin tức',
      stats: [
        { label: 'Đã xuất bản', value: postCount, color: 'text-green-400' },
        { label: 'Bản nháp', value: draftCount, color: 'text-yellow-400' },
      ],
    },
    {
      href: '/admin/content/banners',
      icon: ImageOff,
      title: 'Banner & Quảng Cáo',
      desc: 'Quản lý banner hiển thị trên trang chủ và các trang',
      stats: [
        { label: 'Đang hiển thị', value: bannerCount, color: 'text-green-400' },
      ],
    },
    {
      href: '/admin/content/seo',
      icon: Globe,
      title: 'SEO Pages',
      desc: 'Tùy chỉnh meta title, description, schema cho từng trang',
      stats: [
        { label: 'Trang đã cấu hình', value: seoCount, color: 'text-blue-400' },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản Lý Nội Dung</h1>
          <p className="mt-0.5 text-sm text-gray-500">Blog, banner quảng cáo và cấu hình SEO</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60 p-5 transition-colors hover:border-red-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900">
                  <Icon className="h-4 w-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-gray-200 group-hover:text-red-400 transition-colors">{s.title}</h3>
              <p className="mb-4 text-sm text-gray-300">{s.desc}</p>
              <div className="flex gap-4">
                {s.stats.map((st) => (
                  <div key={st.label}>
                    <div className={`text-xl font-bold ${st.color}`}>{st.value}</div>
                    <div className="text-xs text-gray-500">{st.label}</div>
                  </div>
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
