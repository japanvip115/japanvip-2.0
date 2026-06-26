import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Hành Hàng Gia Dụng Nhật Bản',
  description:
    'Chính sách bảo hành của Japan VIP cho hàng gia dụng nội địa Nhật Bản: thời hạn, điều kiện, quy trình bảo hành và các trường hợp không được bảo hành.',
  alternates: { canonical: '/chinh-sach-bao-hanh' },
}

export default function ChinhSachBaoHanhPage() {
  return (
    <LegalPage title="Chính Sách Bảo Hành" updated="26/06/2026">
      <p>
        Hàng gia dụng nội địa Nhật Bản tại Japan VIP được cam kết chính hãng, mới 100% và hỗ trợ bảo hành đầy đủ.
      </p>

      <h2>1. Thời hạn bảo hành</h2>
      <p>
        Japan VIP bảo hành <strong>12 tháng</strong> cho lỗi kỹ thuật của nhà sản xuất, kể từ ngày khách hàng nhận
        sản phẩm. Thông tin bảo hành được ghi trên hóa đơn hoặc phiếu bảo hành kèm theo sản phẩm.
      </p>

      <h2>2. Điều kiện bảo hành</h2>
      <ul>
        <li>Sản phẩm còn trong thời hạn bảo hành, có hóa đơn / phiếu bảo hành của Japan VIP.</li>
        <li>Lỗi do nhà sản xuất, linh kiện, không do người dùng tác động.</li>
        <li>Tem bảo hành còn nguyên vẹn, không bị rách hoặc tẩy xóa.</li>
      </ul>

      <h2>3. Không áp dụng bảo hành</h2>
      <ul>
        <li>Hư hỏng do sử dụng sai hướng dẫn, sai điện áp (lưu ý hàng nội địa Nhật thường dùng điện 100V).</li>
        <li>Vào nước, cháy nổ, va đập, thiên tai, côn trùng.</li>
        <li>Tự ý tháo lắp, sửa chữa tại nơi không được Japan VIP ủy quyền.</li>
      </ul>

      <h2>4. Lưu ý về điện áp</h2>
      <p>
        Nhiều thiết bị nội địa Nhật sử dụng nguồn điện 100V. Vui lòng tham khảo tư vấn về biến áp phù hợp trước khi
        sử dụng tại Việt Nam (điện 220V) để tránh hư hỏng không được bảo hành.
      </p>

      <h2>5. Quy trình bảo hành</h2>
      <p>
        Liên hệ hotline 0988.969.896 hoặc email info@japanvip.vn, cung cấp thông tin đơn hàng và mô tả lỗi để được
        hướng dẫn. Tham khảo thêm <Link href="/chinh-sach-doi-tra">chính sách đổi trả</Link>.
      </p>
    </LegalPage>
  )
}
