import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Hướng Dẫn Mua Hàng Tại Japan VIP',
  description:
    'Hướng dẫn mua hàng gia dụng nội địa Nhật Bản tại Japan VIP: cách đặt hàng, thanh toán, dịch vụ mua hộ từ Nhật và đấu giá. Đơn giản, nhanh chóng, an toàn.',
  alternates: { canonical: '/huong-dan-mua-hang' },
}

export default function HuongDanMuaHangPage() {
  return (
    <LegalPage title="Hướng Dẫn Mua Hàng" updated="26/06/2026">
      <p>
        Mua hàng tại Japan VIP rất đơn giản. Dưới đây là hướng dẫn các hình thức mua hàng gia dụng nội địa Nhật Bản.
      </p>

      <h2>1. Mua sản phẩm có sẵn</h2>
      <ol>
        <li>Chọn sản phẩm tại trang <Link href="/san-pham">Sản Phẩm</Link> và bấm “Thêm vào giỏ” hoặc “Mua ngay”.</li>
        <li>Kiểm tra giỏ hàng, điền thông tin nhận hàng (họ tên, số điện thoại, địa chỉ).</li>
        <li>Chọn phương thức thanh toán và xác nhận đơn hàng.</li>
        <li>Japan VIP liên hệ xác nhận và tiến hành giao hàng.</li>
      </ol>

      <h2>2. Dịch vụ mua hộ từ Nhật</h2>
      <p>
        Với sản phẩm chưa có sẵn, bạn dùng dịch vụ <Link href="/mua-ho">mua hộ từ Nhật</Link>: dán link sản phẩm từ
        Amazon Japan, Rakuten, Mercari… để nhận báo giá tức thì (đã gồm giá sản phẩm, phí vận chuyển JP→VN và phí
        dịch vụ). Đặt cọc tối thiểu để Japan VIP tiến hành mua hộ.
      </p>

      <h2>3. Tham gia đấu giá</h2>
      <p>
        Tại <Link href="/dau-gia">Sàn Đấu Giá</Link>, bạn đặt giá cho sản phẩm Nhật chính hãng với mức giá tốt. Người
        thắng phiên hoàn tất thanh toán và nhận hàng theo quy trình thông thường.
      </p>

      <h2>4. Thanh toán</h2>
      <p>
        Japan VIP hỗ trợ thanh toán qua VNPay, chuyển khoản ngân hàng và các phương thức được niêm yết khi đặt hàng.
      </p>

      <h2>5. Cần hỗ trợ?</h2>
      <p>
        Liên hệ hotline 0988.969.896 (08:00–18:30 tất cả các ngày) hoặc qua{' '}
        <Link href="/lien-he">trang Liên Hệ</Link>. Xem thêm{' '}
        <Link href="/chinh-sach-van-chuyen">chính sách vận chuyển</Link> và{' '}
        <Link href="/chinh-sach-bao-hanh">chính sách bảo hành</Link>.
      </p>
    </LegalPage>
  )
}
