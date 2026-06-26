import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng',
  description:
    'Chính sách bảo mật của Japan VIP: cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của khách hàng khi mua hàng gia dụng nội địa Nhật Bản.',
  alternates: { canonical: '/chinh-sach-bao-mat' },
}

export default function ChinhSachBaoMatPage() {
  return (
    <LegalPage title="Chính Sách Bảo Mật" updated="26/06/2026">
      <p>
        Japan VIP cam kết bảo vệ thông tin cá nhân của khách hàng. Chính sách này giải thích cách chúng tôi thu thập,
        sử dụng, lưu trữ và bảo vệ dữ liệu của bạn khi sử dụng website japanvip.vn và các dịch vụ liên quan.
      </p>

      <h2>1. Thông tin chúng tôi thu thập</h2>
      <ul>
        <li>Họ tên, số điện thoại, email, địa chỉ giao hàng khi bạn đặt hàng hoặc đăng ký tài khoản.</li>
        <li>Thông tin đơn hàng, lịch sử mua sắm và yêu cầu hỗ trợ.</li>
        <li>Dữ liệu kỹ thuật ẩn danh (loại thiết bị, trình duyệt) phục vụ cải thiện trải nghiệm.</li>
      </ul>

      <h2>2. Mục đích sử dụng</h2>
      <ul>
        <li>Xử lý đơn hàng, giao hàng, bảo hành và chăm sóc khách hàng.</li>
        <li>Thông báo về tình trạng đơn hàng, chương trình ưu đãi (khi bạn đồng ý nhận).</li>
        <li>Nâng cao chất lượng sản phẩm và dịch vụ.</li>
      </ul>

      <h2>3. Bảo mật &amp; chia sẻ thông tin</h2>
      <p>
        Chúng tôi <strong>không bán, trao đổi thông tin cá nhân</strong> của khách hàng cho bên thứ ba vì mục đích
        thương mại. Thông tin chỉ được chia sẻ với đơn vị vận chuyển, cổng thanh toán trong phạm vi cần thiết để
        hoàn tất đơn hàng, hoặc khi có yêu cầu hợp pháp từ cơ quan nhà nước.
      </p>

      <h2>4. Quyền của khách hàng</h2>
      <p>
        Bạn có quyền yêu cầu kiểm tra, chỉnh sửa hoặc xóa thông tin cá nhân của mình bằng cách{' '}
        <Link href="/lien-he">liên hệ với chúng tôi</Link> qua hotline 0988.969.896 hoặc email info@japanvip.vn.
      </p>

      <h2>5. Liên hệ</h2>
      <p>
        Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ Japan VIP — 115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng —
        Hotline 0988.969.896 — Email info@japanvip.vn.
      </p>
    </LegalPage>
  )
}
