import type { Metadata } from 'next'
import { BrandForm } from '@/components/admin/brand-form'

export const metadata: Metadata = { title: 'Admin — Thêm Thương Hiệu' }

export default function AdminBrandNewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Thêm Thương Hiệu Mới</h1>
        <p className="text-sm text-gray-400">Tạo thương hiệu để gán cho sản phẩm</p>
      </div>
      <BrandForm mode="create" />
    </div>
  )
}
