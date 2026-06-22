import { prisma } from '@japanvip/db'
import { ProductContentSettings } from '@/components/admin/product-content-settings'

// Next.js page.tsx KHÔNG được export biến thường (chỉ default + metadata...) → để const cục bộ
const DEFAULT_COMMITMENTS = 'Hàng nội địa Nhật Bản mới 100%, nguyên hộp\nNhập khẩu trực tiếp, có tem nhập khẩu đầy đủ\nMiễn phí vận chuyển toàn quốc'
const DEFAULT_SHIPPING = 'Giao hàng trong 2 giờ (HN & TP. HCM)\nMiễn phí ship toàn quốc\nHướng dẫn sử dụng sản phẩm tại nhà'

export default async function ProductContentSettingsPage() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: ['product.commitments', 'product.shipping_notes'] } } })
  const commitments = rows.find((r) => r.key === 'product.commitments')?.value ?? DEFAULT_COMMITMENTS
  const shipping = rows.find((r) => r.key === 'product.shipping_notes')?.value ?? DEFAULT_SHIPPING

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
          <a href="/admin/settings" className="hover:text-gray-300">Cài Đặt</a>
          <span>/</span>
          <span>Nội Dung Trang Sản Phẩm</span>
        </div>
        <h1 className="text-xl font-bold text-white">Nội Dung Trang Sản Phẩm</h1>
        <p className="mt-1 text-sm text-gray-400">Chỉnh các dòng cam kết và ô giao hàng hiển thị bên phải mọi trang sản phẩm.</p>
      </div>
      <ProductContentSettings initialCommitments={commitments} initialShipping={shipping} />
    </div>
  )
}
