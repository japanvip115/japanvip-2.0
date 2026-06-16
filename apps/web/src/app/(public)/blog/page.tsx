import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Blog Nhật Bản — Japan VIP' }

const PLACEHOLDER_POSTS = [
  { slug: 'mua-hang-amazon-nhat', title: 'Hướng dẫn mua hàng Amazon Nhật Bản từ A-Z', category: 'Hướng Dẫn', date: '10/06/2026', excerpt: 'Tất cả những gì bạn cần biết khi đặt mua hàng từ Amazon Japan về Việt Nam một cách an toàn và tiết kiệm.' },
  { slug: 'gia-dung-nhat-tot-nhat', title: 'Top 10 đồ gia dụng Nhật Bản đáng mua nhất 2026', category: 'Review', date: '05/06/2026', excerpt: 'Từ nồi cơm Tiger đến máy lọc không khí Daikin — những sản phẩm nội địa Nhật được yêu thích nhất tại Việt Nam.' },
  { slug: 'phi-mua-ho-nhat', title: 'Chi phí mua hộ hàng Nhật thực tế là bao nhiêu?', category: 'Kiến Thức', date: '01/06/2026', excerpt: 'Phân tích chi tiết các loại phí khi đặt mua hộ hàng Nhật: phí dịch vụ, ship nội địa, hải quan và vận chuyển về VN.' },
  { slug: 'rakuten-vs-amazon', title: 'Rakuten vs Amazon Japan — Mua ở đâu lợi hơn?', category: 'So Sánh', date: '28/05/2026', excerpt: 'So sánh hai sàn thương mại điện tử lớn nhất Nhật Bản về giá, chính sách hoàn tiền và độ an toàn.' },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Hướng Dẫn': 'bg-blue-100 text-blue-700',
  'Review': 'bg-green-100 text-green-700',
  'Kiến Thức': 'bg-purple-100 text-purple-700',
  'So Sánh': 'bg-orange-100 text-orange-700',
}

export default function BlogPage() {
  return (
    <div className="bg-gray-50">
      <div className="bg-gray-900 py-6 text-center text-white">
        <h1 className="text-3xl font-bold">Blog Nhật Bản</h1>
        <p className="mt-2 text-gray-400">Kiến thức mua hàng, review sản phẩm và hướng dẫn hữu ích</p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {PLACEHOLDER_POSTS.map((post) => (
            <article key={post.slug} className="group rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm hover:border-brand-red/30 hover:shadow-md transition-all">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[post.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {post.category}
                </span>
                <span className="text-xs text-gray-400">{post.date}</span>
              </div>
              <h2 className="text-xs md:text-base font-bold text-gray-900 group-hover:text-brand-red transition-colors leading-snug line-clamp-3">
                {post.title}
              </h2>
              <p className="mt-1.5 text-xs md:text-sm text-gray-500 line-clamp-2 hidden md:block">{post.excerpt}</p>
              <div className="mt-3">
                <span className="text-xs md:text-sm font-semibold text-brand-red">Đọc thêm →</span>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">Nội dung blog sẽ được cập nhật thường xuyên.</p>
      </div>
    </div>
  )
}
