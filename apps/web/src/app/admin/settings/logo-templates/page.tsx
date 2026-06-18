import type { Metadata } from 'next'
import { LogoTemplatesManager } from '@/components/admin/logo-templates-manager'

export const metadata: Metadata = { title: 'Admin — Logo Templates' }
export const dynamic = 'force-dynamic'

export default function LogoTemplatesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Logo Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Thêm ảnh logo mẫu để hệ thống tự động nhận diện và xoá logo khỏi ảnh sản phẩm.
        </p>
      </div>
      <LogoTemplatesManager />
    </div>
  )
}
