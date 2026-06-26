import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Điều Khoản Sử Dụng Website Japan VIP',
  description:
    'Điều khoản sử dụng website japanvip.vn: quyền và nghĩa vụ của khách hàng khi mua hàng, đặt hàng, sử dụng dịch vụ mua hộ và đấu giá hàng Nhật tại Japan VIP.',
  alternates: { canonical: '/dieu-khoan-su-dung' },
}

export default function DieuKhoanSuDungPage() {
  return (
    <LegalPage title="Điều Khoản Sử Dụng" updated="26/06/2026">
      <p>
        Khi truy cập và sử dụng website japanvip.vn, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước
        khi đặt hàng hoặc sử dụng dịch vụ của Japan VIP.
      </p>

      <h2>1. Sử dụng website</h2>
      <ul>
        <li>Khách hàng cung cấp thông tin chính xác, đầy đủ khi đặt hàng và đăng ký tài khoản.</li>
        <li>Không sử dụng website vào mục đích trái pháp luật, gian lận hoặc gây ảnh hưởng đến hệ thống.</li>
        <li>Toàn bộ nội dung, hình ảnh, thương hiệu trên website thuộc quyền sở hữu của Japan VIP.</li>
      </ul>

      <h2>2. Đặt hàng &amp; giá cả</h2>
      <p>
        Giá sản phẩm được niêm yết bằng VNĐ và có thể thay đổi theo tỷ giá, thị trường mà không cần báo trước.
        Đơn hàng chỉ được xác nhận sau khi Japan VIP liên hệ và bạn đồng ý với giá cuối cùng.
      </p>

      <h2>3. Dịch vụ mua hộ &amp; đấu giá</h2>
      <p>
        Với dịch vụ <Link href="/mua-ho">mua hộ từ Nhật</Link> và đấu giá, khách hàng đặt cọc theo quy định, thanh
        toán phần còn lại trước khi giao hàng. Thời gian và chi phí vận chuyển phụ thuộc vào trọng lượng và loại
        hàng hóa.
      </p>

      <h2>4. Thanh toán</h2>
      <p>
        Japan VIP hỗ trợ thanh toán qua VNPay, chuyển khoản ngân hàng và các phương thức được niêm yết tại thời
        điểm đặt hàng. Mọi giao dịch đều được bảo mật.
      </p>

      <h2>5. Chính sách liên quan</h2>
      <p>
        Việc sử dụng dịch vụ đồng nghĩa bạn đồng ý với{' '}
        <Link href="/chinh-sach-doi-tra">chính sách đổi trả</Link>,{' '}
        <Link href="/chinh-sach-van-chuyen">chính sách vận chuyển</Link>,{' '}
        <Link href="/chinh-sach-bao-hanh">chính sách bảo hành</Link> và{' '}
        <Link href="/chinh-sach-bao-mat">chính sách bảo mật</Link> của Japan VIP.
      </p>
    </LegalPage>
  )
}
