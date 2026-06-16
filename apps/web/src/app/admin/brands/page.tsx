import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Plus, Pencil, Globe } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Thương Hiệu' }
export const dynamic = 'force-dynamic'

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Thương Hiệu</h1>
          <p className="mt-0.5 text-sm text-gray-500">{brands.length} thương hiệu</p>
        </div>
        <Link
          href="/admin/brands/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Thêm Thương Hiệu
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Thương hiệu</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Xuất xứ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {brands.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Chưa có thương hiệu nào.{' '}
                  <Link href="/admin/brands/new" className="text-red-400 hover:underline">
                    Tạo ngay
                  </Link>
                </td>
              </tr>
            )}
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="h-8 w-8 rounded object-contain bg-gray-900 p-0.5 border border-gray-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700/80 text-gray-300 text-xs font-bold ring-1 ring-inset ring-gray-600/50">
                        {brand.name[0]}
                      </div>
                    )}
                    <span className="font-medium text-gray-200">{brand.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{brand.slug}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm text-gray-300">
                    <Globe className="h-3.5 w-3.5 text-gray-500" />
                    {brand.country}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-300">{brand._count.products}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      brand.isActive
                        ? 'bg-green-500/15 text-green-400 ring-green-500/20'
                        : 'bg-gray-500/15 text-gray-400 ring-gray-500/20'
                    }`}
                  >
                    {brand.isActive ? 'Hiện' : 'Ẩn'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/brands/${brand.id}`}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Sửa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
