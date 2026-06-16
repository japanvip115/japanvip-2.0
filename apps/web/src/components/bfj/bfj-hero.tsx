export function BfjHero() {
  return (
    <section className="bg-gradient-to-br from-slate-800 to-gray-900 py-20 text-white">
      <div className="container text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
          Hỗ trợ Amazon JP · Rakuten · Mercari · Yahoo Shopping
        </div>
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Mua Hộ Hàng Nhật Bản
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-red-100">
          Dán link sản phẩm — chúng tôi mua và ship thẳng về tận nhà bạn tại Việt Nam.
          Phí dịch vụ chỉ từ <span className="font-bold text-yellow-300">8%</span>,
          ship <span className="font-bold text-yellow-300">7–21 ngày</span>.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          {[
            { icon: '✅', label: 'Chính hãng 100%' },
            { icon: '🚚', label: 'Ship toàn quốc' },
            { icon: '🔒', label: 'Đặt cọc an toàn' },
            { icon: '📦', label: 'Theo dõi đơn hàng' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-red-100">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
