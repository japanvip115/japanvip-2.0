import type { Metadata } from 'next'

// Trang tra cứu đơn (kết quả động, không nội dung index được) → noindex.
export const metadata: Metadata = {
  title: 'Theo dõi đơn hàng',
  robots: { index: false, follow: true },
}

export default function TheoDoiDonLayout({ children }: { children: React.ReactNode }) {
  return children
}
