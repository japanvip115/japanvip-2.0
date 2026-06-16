import type { Metadata } from 'next'
import Link from 'next/link'
import { SeoPageForm } from '@/components/admin/seo-page-form'

export const metadata: Metadata = { title: 'Admin — Thêm SEO Page' }

export default function AdminSeoNewPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/admin/content" className="hover:text-white">Nội Dung</Link>
          <span>/</span>
          <Link href="/admin/content/seo" className="hover:text-white">SEO Pages</Link>
          <span>/</span>
          <span>Thêm mới</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Thêm Cấu Hình SEO</h1>
      </div>
      <SeoPageForm mode="create" />
    </div>
  )
}
