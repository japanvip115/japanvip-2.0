import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Chính Sách Đổi Trả Hàng Gia Dụng Nhật Bản',
  description:
    'Chính sách đổi trả của Japan VIP: điều kiện, thời hạn và quy trình đổi trả hàng gia dụng nội địa Nhật Bản. Hỗ trợ đổi trả với sản phẩm lỗi do nhà sản xuất.',
  alternates: { canonical: '/chinh-sach-doi-tra' },
}

export default function ChinhSachDoiTraPage() {
  return (
    <LegalPage title="Chính Sách Đổi Trả" updated="26/06/2026">
      <p>
        Japan VIP mong muốn khách hàng hài lòng với mỗi sản phẩm. Chính sách đổi trả dưới đây áp dụng cho hàng gia
        dụng nội địa Nhật Bản mua tại japanvip.vn.
      </p>

      <h2>1. Điều kiện đổi trả</h2>
      <ul>
        <li>Sản phẩm lỗi kỹ thuật do nhà sản xuất, không phải do người dùng tác động.</li>
        <li>Sản phẩm giao sai mẫu mã, sai thông số so với đơn đặt hàng.</li>
        <li>Còn nguyên tem, hộp, phụ kiện và đầy đủ hóa đơn / chứng từ mua hàng.</li>
      </ul>

      <h2>2. Thời hạn đổi trả</h2>
      <p>
        Trong vòng <strong>7 ngày</strong> kể từ ngày nhận hàng đối với lỗi nhà sản xuất hoặc giao sai. Vui lòng quay
        video mở hộp để được hỗ trợ nhanh và chính xác nhất.
      </p>

      <h2>3. Trường hợp không áp dụng</h2>
      <ul>
        <li>Sản phẩm hư hỏng do sử dụng, va đập, vào nước, sai điện áp / nguồn điện.</li>
        <li>Đã qua sử dụng, trầy xước, mất tem, thiếu phụ kiện.</li>
        <li>Hết thời hạn đổi trả quy định.</li>
      </ul>

      <h2>4. Quy trình</h2>
      <ol>
        <li>Liên hệ hotline 0988.969.896 hoặc email info@japanvip.vn để thông báo yêu cầu.</li>
        <li>Cung cấp thông tin đơn hàng, hình ảnh / video tình trạng sản phẩm.</li>
        <li>Japan VIP xác nhận và hướng dẫn gửi trả; tiến hành đổi mới hoặc hoàn tiền theo thỏa thuận.</li>
      </ol>

      <p>
        Tham khảo thêm <Link href="/chinh-sach-bao-hanh">chính sách bảo hành</Link> và{' '}
        <Link href="/chinh-sach-van-chuyen">chính sách vận chuyển</Link>.
      </p>
    </LegalPage>
  )
}
