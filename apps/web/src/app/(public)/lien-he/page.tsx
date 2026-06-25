import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Liên Hệ — Japan VIP' }

const CONTACTS = [
  { icon: '📞', label: 'Hotline', value: '0988.969.896', href: 'tel:0988969896', color: 'bg-red-50 text-red-600' },
  { icon: '📱', label: 'Di động', value: '0967.868.688', href: 'tel:0967868688', color: 'bg-orange-50 text-orange-600' },
  { icon: '✉️', label: 'Email', value: 'info@japanvip.vn', href: 'mailto:info@japanvip.vn', color: 'bg-blue-50 text-blue-600' },
  { icon: '💬', label: 'Zalo', value: 'zalo.me/0988969896', href: 'https://zalo.me/0988969896', color: 'bg-sky-50 text-sky-600' },
]

const ADDRESSES = [
  { icon: '🏢', label: 'Trụ sở chính', value: '115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng' },
  { icon: '🏪', label: 'Showroom Hà Nội', value: '21 Lê Văn Lương, Thanh Xuân, Hà Nội' },
  { icon: '🕐', label: 'Giờ hỗ trợ', value: '08:00 – 18:30 · Tất cả các ngày trong tuần' },
]

const LIEN_HE_SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://japanvip.vn/#localbusiness',
    name: 'Japan VIP',
    description: 'Nhập khẩu và phân phối hàng gia dụng nội địa Nhật Bản chính hãng tại Việt Nam.',
    url: 'https://japanvip.vn',
    telephone: '+84988969896',
    email: 'info@japanvip.vn',
    address: { '@type': 'PostalAddress', streetAddress: '115 Đinh Tiên Hoàng', addressLocality: 'Hải Phòng', addressCountry: 'VN' },
    openingHours: 'Mo-Su 08:00-18:30',
    sameAs: ['https://facebook.com/japanvip', 'https://youtube.com/c/JapanvipVn1'],
    hasMap: 'https://maps.google.com/?q=115+Đinh+Tiên+Hoàng,+Hải+Phòng',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Japan VIP ở đâu?', acceptedAnswer: { '@type': 'Answer', text: 'Japan VIP có trụ sở tại 115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng và showroom tại 21 Lê Văn Lương, Thanh Xuân, Hà Nội.' } },
      { '@type': 'Question', name: 'Hotline Japan VIP là số mấy?', acceptedAnswer: { '@type': 'Answer', text: 'Hotline Japan VIP: 0988.969.896 và 0967.868.688. Hỗ trợ 08:00–18:30, tất cả các ngày trong tuần.' } },
      { '@type': 'Question', name: 'Japan VIP làm việc mấy giờ?', acceptedAnswer: { '@type': 'Answer', text: 'Japan VIP hỗ trợ khách hàng từ 08:00 đến 18:30, tất cả các ngày trong tuần kể cả thứ 7 và chủ nhật.' } },
      { '@type': 'Question', name: 'Có thể liên hệ Japan VIP qua Zalo không?', acceptedAnswer: { '@type': 'Answer', text: 'Có, bạn có thể liên hệ Japan VIP qua Zalo tại zalo.me/0988969896 để được tư vấn và hỗ trợ nhanh nhất.' } },
    ],
  },
]

export default function LienHePage() {
  return (
    <div className="min-h-[60vh]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LIEN_HE_SCHEMA) }} />
      {/* Hero */}
      <div className="relative overflow-hidden bg-gray-900 py-16 text-center">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <p className="relative mb-3 text-sm font-semibold uppercase tracking-widest text-red-400">Liên Hệ Với Chúng Tôi</p>
        <h1 className="relative text-4xl font-black text-white">JAPAN VIP — Hỗ Trợ 24/7</h1>
        <p className="relative mt-3 text-gray-400">Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn</p>
      </div>

      <div className="bg-gray-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

            {/* Left */}
            <div className="space-y-8">
              {/* Quick contact */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-gray-900">Liên Hệ Nhanh</h2>
                <div className="grid grid-cols-2 gap-3">
                  {CONTACTS.map((c) => (
                    <a key={c.label} href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl ${c.color}`}>
                        {c.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-400">{c.label}</p>
                        <p className="truncate text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{c.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-gray-900">Địa Chỉ & Giờ Làm Việc</h2>
                <div className="space-y-3">
                  {ADDRESSES.map((a) => (
                    <div key={a.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <span className="mt-0.5 text-xl">{a.icon}</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{a.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-gray-800">{a.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-gray-700">Theo dõi chúng tôi</p>
                <div className="flex gap-3">
                  <a href="https://facebook.com/japanvip" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    📘 Facebook
                  </a>
                  <a href="https://youtube.com/c/JapanvipVn1" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                    ▶️ YouTube
                  </a>
                  <a href="https://zalo.me/0988969896" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors">
                    💬 Zalo
                  </a>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="mb-1 text-xl font-black text-gray-900">Gửi Tin Nhắn</h2>
              <p className="mb-6 text-sm text-gray-500">Điền thông tin bên dưới, chúng tôi phản hồi trong vòng 30 phút</p>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Số điện thoại <span className="text-red-500">*</span></label>
                    <input type="tel" placeholder="0988 xxx xxx"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                  <input type="email" placeholder="email@example.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Chủ đề</label>
                  <select className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-white">
                    <option value="">— Chọn chủ đề —</option>
                    <option>Tư vấn sản phẩm</option>
                    <option>Đặt hàng & Mua hộ</option>
                    <option>Theo dõi đơn hàng</option>
                    <option>Bảo hành & Đổi trả</option>
                    <option>Hợp tác kinh doanh</option>
                    <option>Khác</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nội dung <span className="text-red-500">*</span></label>
                  <textarea rows={5} placeholder="Nhập nội dung cần hỗ trợ..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
                </div>
                <button type="submit"
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700">
                  Gửi Tin Nhắn →
                </button>
                <p className="text-center text-xs text-gray-400">Hoặc gọi ngay <a href="tel:0988969896" className="font-semibold text-red-600">0988.969.896</a> để được hỗ trợ tức thì</p>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
