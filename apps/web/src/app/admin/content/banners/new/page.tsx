import type { Metadata } from 'next'
import Link from 'next/link'
import { BannerForm } from '@/components/admin/banner-form'

export const metadata: Metadata = { title: 'Admin — Thêm Banner' }

export default function AdminBannerNewPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/admin/content" className="hover:text-white">Nội Dung</Link>
          <span>/</span>
          <Link href="/admin/content/banners" className="hover:text-white">Banner</Link>
          <span>/</span>
          <span>Thêm mới</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Thêm Banner Mới</h1>
      </div>
      <BannerForm mode="create" />
    </div>
  )
}
