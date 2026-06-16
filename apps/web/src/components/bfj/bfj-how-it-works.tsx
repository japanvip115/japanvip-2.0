const STEPS = [
  {
    step: '01',
    title: 'Dán link sản phẩm',
    desc: 'Copy link từ Amazon JP, Rakuten, Mercari hoặc Yahoo Shopping và dán vào ô tìm kiếm.',
  },
  {
    step: '02',
    title: 'Nhận báo giá',
    desc: 'Hệ thống tự động lấy thông tin sản phẩm và tính chi phí bao gồm phí dịch vụ + vận chuyển.',
  },
  {
    step: '03',
    title: 'Đặt cọc 30%',
    desc: 'Xác nhận đơn và đặt cọc 30% tổng giá trị. Chúng tôi tiến hành mua hàng tại Nhật ngay.',
  },
  {
    step: '04',
    title: 'Nhận hàng tại nhà',
    desc: 'Hàng về kho Việt Nam, giao tận nhà trong 7–21 ngày. Thanh toán phần còn lại khi nhận hàng.',
  },
]

export function BfjHowItWorks() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="container">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
          Quy trình mua hộ
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 text-4xl font-black text-red-100">{s.step}</div>
              <h3 className="mb-2 font-bold text-gray-900">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
