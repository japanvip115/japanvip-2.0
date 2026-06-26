import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Chính Sách Vận Chuyển & Giao Hàng Toàn Quốc',
  description:
    'Chính sách vận chuyển của Japan VIP: giao hàng gia dụng nội địa Nhật Bản toàn quốc, thời gian, phí vận chuyển và quy trình nhận hàng, kiểm tra khi nhận.',
  alternates: { canonical: '/chinh-sach-van-chuyen' },
}

export default function ChinhSachVanChuyenPage() {
  return (
    <LegalPage title="Chính Sách Vận Chuyển" updated="26/06/2026">
      <p>
        Japan VIP giao hàng gia dụng nội địa Nhật Bản trên <strong>toàn quốc</strong> qua các đơn vị vận chuyển uy tín,
        đảm bảo hàng hóa được đóng gói cẩn thận và đến tay khách hàng an toàn.
      </p>

      <h2>1. Phạm vi &amp; thời gian giao hàng</h2>
      <ul>
        <li>Nội thành Hải Phòng, Hà Nội: 1–3 ngày làm việc.</li>
        <li>Các tỉnh thành khác: 3–7 ngày làm việc tùy khu vực.</li>
        <li>Hàng mua hộ / đấu giá từ Nhật: thời gian phụ thuộc lịch về hàng, được thông báo khi đặt.</li>
      </ul>

      <h2>2. Phí vận chuyển</h2>
      <p>
        Phí vận chuyển nội địa được tính theo khu vực và trọng lượng đơn hàng, hiển thị khi đặt hàng. Với dịch vụ{' '}
        <Link href="/mua-ho">mua hộ từ Nhật</Link>, phí vận chuyển quốc tế JP→VN được tính theo cân nặng thực tế.
      </p>

      <h2>3. Kiểm tra khi nhận hàng</h2>
      <ul>
        <li>Khách hàng kiểm tra tình trạng kiện hàng, đối chiếu sản phẩm trước khi thanh toán (với COD).</li>
        <li>Khuyến khích quay video lúc mở hộp để thuận tiện xử lý nếu phát sinh khiếu nại.</li>
        <li>Nếu phát hiện hư hỏng do vận chuyển, vui lòng từ chối nhận hoặc liên hệ ngay hotline.</li>
      </ul>

      <h2>4. Hỗ trợ</h2>
      <p>
        Mọi vấn đề về giao hàng, vui lòng liên hệ hotline 0988.969.896 (08:00–18:30 tất cả các ngày) hoặc tham khảo{' '}
        <Link href="/chinh-sach-doi-tra">chính sách đổi trả</Link>.
      </p>
    </LegalPage>
  )
}
