import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BannerForm } from '@/components/admin/banner-form'

export const metadata: Metadata = { title: 'Admin — Sửa Banner' }

export default async function AdminBannerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const banner = await prisma.banner.findUnique({ where: { id } })
  if (!banner) notFound()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/admin/content" className="hover:text-white">Nội Dung</Link>
          <span>/</span>
          <Link href="/admin/content/banners" className="hover:text-white">Banner</Link>
          <span>/</span>
          <span>Sửa</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sửa Banner</h1>
      </div>
      <BannerForm mode="edit" initial={banner} />
    </div>
  )
}
