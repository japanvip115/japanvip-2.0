import { Fragment } from 'react'

const STEPS = [
  { num: 1, icon: '🔗', title: 'Dán Link', desc: 'Copy link sản phẩm từ Amazon JP, Rakuten, Mercari hoặc Yahoo Shopping Japan' },
  { num: 2, icon: '💰', title: 'Xem Báo Giá', desc: 'Hệ thống tự động tính giá, phí ship, phí dịch vụ và tổng chi phí về VN' },
  { num: 3, icon: '💳', title: 'Đặt Cọc', desc: 'Thanh toán đặt cọc 30–50% qua ngân hàng để xác nhận đơn hàng' },
  { num: 4, icon: '📦', title: 'Nhận Hàng', desc: '7–14 ngày hàng về VN, giao tận nhà toàn quốc' },
]

export function BfjHowItWorks() {
  return (
    <section className="bg-gray-50 py-10">
      <div className="container">
        <div className="how-it-works">
          <h3>📋 Quy Trình 4 Bước Đơn Giản</h3>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Fragment key={s.num}>
                <div className="step">
                  <div className="step-num">{s.num}</div>
                  <div className="step-icon">{s.icon}</div>
                  <div className="step-content">
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <div className="step-arrow">→</div>}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
