import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { BrandForm } from '@/components/admin/brand-form'

export const metadata: Metadata = { title: 'Admin — Sửa Thương Hiệu' }

export default async function AdminBrandEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await prisma.brand.findUnique({ where: { id } })
  if (!brand) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sửa Thương Hiệu</h1>
        <p className="text-sm text-gray-400">{brand.name}</p>
      </div>
      <BrandForm mode="edit" initial={brand} />
    </div>
  )
}
