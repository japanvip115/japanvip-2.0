'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Phí dịch vụ là bao nhiêu?',
    a: 'Phí dịch vụ cố định 8% trên giá sản phẩm. Bao gồm: mua hàng, kiểm tra, đóng gói, hỗ trợ 1:1.',
  },
  {
    q: 'Mất bao lâu để nhận hàng?',
    a: 'Thông thường 7–21 ngày tùy trọng lượng và phương thức vận chuyển. Hàng đặc biệt (pin, lỏng) mất thêm 3–5 ngày.',
  },
  {
    q: 'Nếu sản phẩm hết hàng thì sao?',
    a: 'Chúng tôi sẽ thông báo ngay và hoàn lại 100% tiền đặt cọc trong 1–3 ngày làm việc.',
  },
  {
    q: 'Có thể đặt nhiều sản phẩm trong 1 đơn không?',
    a: 'Có, bạn có thể đặt tối đa 20 sản phẩm từ nhiều nguồn khác nhau trong cùng 1 đơn hàng.',
  },
  {
    q: 'Những sản phẩm nào không được mua hộ?',
    a: 'Không nhận: thực phẩm tươi, chất lỏng trên 100ml, pin lithium rời, vũ khí, ma tuý và các mặt hàng bị cấm nhập khẩu vào Việt Nam.',
  },
]

export function BfjFaq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">
          Câu hỏi thường gặp
        </h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl border bg-white">
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
                    open === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open === i && (
                <div className="border-t px-6 py-4 text-sm text-gray-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
