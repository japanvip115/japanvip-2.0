import type { Metadata } from 'next'
import { AffiliateRegisterForm } from '@/components/affiliate/affiliate-register-form'

export const metadata: Metadata = {
  title: 'Cộng Tác Viên — Kiếm Hoa Hồng Cùng Japan VIP',
  description: 'Đăng ký làm cộng tác viên Japan VIP. Giới thiệu khách hàng, nhận hoa hồng hấp dẫn cho mỗi đơn hàng thành công.',
}

const HOW_IT_WORKS = [
  { step: '01', title: 'Đăng ký', desc: 'Điền form bên dưới, nhận mã giới thiệu riêng của bạn sau khi được duyệt.' },
  { step: '02', title: 'Chia sẻ', desc: 'Chia sẻ link có mã giới thiệu lên Facebook, Zalo, TikTok... với khách hàng tiềm năng.' },
  { step: '03', title: 'Nhận tiền', desc: 'Khi khách đặt hàng qua link của bạn và đơn hoàn thành, hoa hồng tự động ghi nhận.' },
]

export default function AffiliatePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600/20 border border-red-500/30 px-4 py-1.5 text-sm font-medium text-red-300">
            💰 Chương trình Cộng tác viên
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Kiếm thu nhập cùng<br />
            <span className="text-red-400">Japan VIP</span>
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Giới thiệu hàng gia dụng nội địa Nhật chính hãng và nhận hoa hồng hấp dẫn cho mỗi đơn hàng thành công
          </p>
          <div className="mt-8 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">5%</p>
              <p className="text-sm text-gray-400">Hoa hồng cơ bản</p>
            </div>
            <div className="w-px bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">∞</p>
              <p className="text-sm text-gray-400">Không giới hạn đơn</p>
            </div>
            <div className="w-px bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">24h</p>
              <p className="text-sm text-gray-400">Thanh toán nhanh</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">Cách hoạt động</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((h) => (
              <div key={h.step} className="rounded-xl bg-white border p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                  {h.step}
                </div>
                <h3 className="font-semibold text-gray-900">{h.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register form */}
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">Đăng ký ngay</h2>
          <p className="text-center text-sm text-gray-500 mb-8">Miễn phí · Duyệt trong 24h làm việc</p>
          <AffiliateRegisterForm />
        </div>
      </section>
    </div>
  )
}
