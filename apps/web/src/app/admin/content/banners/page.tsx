import type { Metadata } from 'next'
import { prisma } from '@japanvip/db'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { BannerActions } from './banner-actions'

export const metadata: Metadata = { title: 'Admin — Banner' }
export const dynamic = 'force-dynamic'

export default async function AdminBannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Banner &amp; Quảng Cáo</h1>
          <p className="mt-0.5 text-sm text-gray-500">{banners.length} banner</p>
        </div>
        <Link
          href="/admin/content/banners/new"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Thêm Banner
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Banner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vị trí</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Thứ tự</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thời hạn</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {banners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Chưa có banner nào.{' '}
                  <Link href="/admin/content/banners/new" className="text-red-400 hover:underline">
                    Tạo ngay
                  </Link>
                </td>
              </tr>
            )}
            {banners.map((banner) => (
              <tr key={banner.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-12 w-20 rounded object-cover bg-gray-700"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-300">{banner.title}</div>
                      {banner.linkUrl && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{banner.linkUrl}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-700/30 px-2 py-0.5 font-mono text-xs text-gray-400">{banner.position}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-300">{banner.sortOrder}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {banner.startsAt ? new Date(banner.startsAt).toLocaleDateString('vi-VN') : '—'}
                  {' → '}
                  {banner.endsAt ? new Date(banner.endsAt).toLocaleDateString('vi-VN') : '∞'}
                </td>
                <td className="px-4 py-3 text-center">
                  {banner.isActive ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/20">
                      Hiện
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-500/15 text-gray-400 ring-1 ring-inset ring-gray-500/20">
                      Ẩn
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <BannerActions id={banner.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
