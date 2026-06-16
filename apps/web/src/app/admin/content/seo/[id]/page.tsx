import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SeoPageForm } from '@/components/admin/seo-page-form'

export const metadata: Metadata = { title: 'Admin — Sửa SEO Page' }

export default async function AdminSeoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seoPage = await prisma.seoPage.findUnique({ where: { id } })
  if (!seoPage) notFound()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/admin/content" className="hover:text-white">Nội Dung</Link>
          <span>/</span>
          <Link href="/admin/content/seo" className="hover:text-white">SEO Pages</Link>
          <span>/</span>
          <span>Sửa</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sửa SEO Page</h1>
        <p className="text-sm font-mono text-green-400 mt-1">{seoPage.pagePath}</p>
      </div>
      <SeoPageForm mode="edit" initial={seoPage} />
    </div>
  )
}
