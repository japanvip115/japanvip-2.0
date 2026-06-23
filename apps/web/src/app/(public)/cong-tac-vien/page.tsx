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

const STATS = [
  { value: '5%', label: 'Hoa hồng cơ bản' },
  { value: '∞', label: 'Không giới hạn đơn' },
  { value: '24h', label: 'Thanh toán nhanh' },
]

const BENEFITS = [
  { icon: '🎌', title: 'Thương hiệu uy tín', desc: 'Hàng nội địa Nhật chính hãng 100% — dễ dàng thuyết phục khách hàng.' },
  { icon: '📈', title: 'Hoa hồng minh bạch', desc: 'Theo dõi real-time mọi đơn hàng và hoa hồng ngay trên dashboard riêng.' },
  { icon: '🛡️', title: 'Thanh toán đảm bảo', desc: 'Chuyển khoản đúng hạn về tài khoản ngân hàng bạn đăng ký.' },
]

export default function AffiliatePage() {
  return (
    <div className="bg-[#0f1520]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1520] via-[#161d2b] to-[#0f1520] py-12 text-center text-white sm:py-14">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-red-600/10 blur-[100px]" />
        </div>
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto max-w-3xl px-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-5 py-2 text-sm font-medium tracking-wide text-amber-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            Chương trình Đối Tác Cao Cấp
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Kiến tạo thu nhập cùng
            <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Japan VIP
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
            Trở thành đối tác phân phối hàng gia dụng nội địa Nhật chính hãng.
            Hoa hồng hấp dẫn, minh bạch cho mỗi đơn hàng thành công.
          </p>

          {/* Stats */}
          <div className="mx-auto mt-7 flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:gap-8">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center">
                <div className="flex-1 text-center">
                  <p className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-4xl font-bold text-transparent">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs tracking-wide text-slate-400">{s.label}</p>
                </div>
                {i < STATS.length - 1 && <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative bg-[#0f1520] py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-amber-400/30"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/5 blur-2xl transition-opacity duration-300 group-hover:bg-amber-400/15" />
                <div className="relative">
                  <div className="mb-3 text-3xl">{b.icon}</div>
                  <h3 className="text-lg font-semibold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative bg-gradient-to-b from-[#0f1520] to-[#161d2b] py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/80">Quy trình</p>
            <h2 className="text-3xl font-bold text-white">Chỉ 3 bước đơn giản</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} className="relative text-center">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-amber-400/40 to-transparent sm:block" />
                )}
                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-b from-amber-400/15 to-transparent text-xl font-bold text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.15)]">
                  {h.step}
                </div>
                <h3 className="text-lg font-semibold text-white">{h.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-300">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register form */}
      <section className="relative overflow-hidden bg-[#161d2b] py-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <div className="relative mx-auto max-w-lg px-4">
          <div className="mb-6 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/80">Bắt đầu ngay</p>
            <h2 className="text-3xl font-bold text-white">Đăng ký đối tác</h2>
            <p className="mt-2 text-sm text-slate-300">Miễn phí · Xét duyệt trong 24h làm việc</p>
          </div>
          <AffiliateRegisterForm />
        </div>
      </section>
    </div>
  )
}
