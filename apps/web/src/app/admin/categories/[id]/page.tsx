import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import { notFound } from 'next/navigation'
import { CategoryForm } from '@/components/admin/category-form'

export const metadata: Metadata = { title: 'Admin — Sửa Danh Mục' }

export default async function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [category, parents] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.category.findMany({
      where: { parentId: null, isActive: true, NOT: { id } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!category) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sửa Danh Mục</h1>
        <p className="text-sm text-gray-400">{category.name}</p>
      </div>
      <CategoryForm mode="edit" parents={parents} initial={category} />
    </div>
  )
}
