import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/layout/legal-page'

export const metadata: Metadata = {
  title: 'Giới Thiệu Japan VIP — Phân Phối Hàng Gia Dụng Nội Địa Nhật Bản',
  description:
    'Japan VIP — doanh nghiệp Việt Nam chuyên nhập khẩu và phân phối hàng gia dụng nội địa Nhật Bản chính hãng, mới 100%, bảo hành đầy đủ, giao toàn quốc.',
  alternates: { canonical: '/gioi-thieu' },
}

export default function GioiThieuPage() {
  return (
    <LegalPage title="Giới Thiệu Japan VIP" updated="26/06/2026">
      <p>
        <strong>Japan VIP</strong> là doanh nghiệp Việt Nam chuyên <strong>nhập khẩu và phân phối hàng gia dụng
        nội địa Nhật Bản chính hãng</strong> trên toàn quốc. Với slogan “Phân phối hàng nội địa Nhật Bản mới 100%”,
        chúng tôi hướng đến trở thành thương hiệu hàng đầu cung cấp hàng Nhật xác thực tại thị trường Việt Nam.
      </p>

      <h2>Tầm nhìn</h2>
      <p>
        Phát triển bền vững, trở thành thương hiệu dẫn đầu trong lĩnh vực phân phối hàng gia dụng Nhật Bản tại Việt Nam.
      </p>

      <h2>Cam kết với khách hàng</h2>
      <ul>
        <li>Sản phẩm chính hãng, mới 100%, nguồn gốc nội địa Nhật Bản rõ ràng.</li>
        <li>Giá cả cập nhật, hợp lý theo thị trường.</li>
        <li>Lắng nghe phản hồi, liên tục cải thiện dịch vụ.</li>
        <li>Bảo hành chính hãng, hỗ trợ đổi trả theo chính sách.</li>
      </ul>

      <h2>Sản phẩm chúng tôi phân phối</h2>
      <p>
        Thiết bị nhà bếp, đồ gia dụng, điều hòa không khí &amp; độ ẩm, thiết bị vệ sinh, đồ điện lạnh
        (tủ lạnh, máy giặt, điều hòa) và các sản phẩm công nghệ xu hướng từ những thương hiệu Nhật Bản uy tín.
      </p>

      <h2>Thông tin doanh nghiệp</h2>
      <ul>
        <li><strong>Tên công ty:</strong> Japan VIP</li>
        <li><strong>Mã số doanh nghiệp:</strong> 0110917536</li>
        <li><strong>Trụ sở chính:</strong> 115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng</li>
        <li><strong>Showroom Hà Nội:</strong> 21 Lê Văn Lương, Thanh Xuân, Hà Nội</li>
        <li><strong>Hotline:</strong> 0988.969.896 — 0967.868.688</li>
        <li><strong>Email:</strong> info@japanvip.vn</li>
        <li><strong>Giờ hỗ trợ:</strong> 08:00 – 18:30 (tất cả các ngày trong tuần)</li>
      </ul>

      <p>
        Bạn cần tư vấn? Hãy <Link href="/lien-he">liên hệ với chúng tôi</Link> hoặc tham khảo{' '}
        <Link href="/huong-dan-mua-hang">hướng dẫn mua hàng</Link>.
      </p>
    </LegalPage>
  )
}
