import type { Metadata } from 'next'
import { FONT_REGISTRY } from '@/lib/fonts'
import { getActiveFont } from '@/lib/font-settings'
import { FontSwitcher } from '@/components/admin/font-switcher'

export const metadata: Metadata = { title: 'Admin — Cài Đặt Typography' }
export const dynamic = 'force-dynamic'

export default async function AdminTypographyPage() {
  const activeFont = await getActiveFont()
  const fonts = Object.values(FONT_REGISTRY)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cài Đặt Typography</h1>
        <p className="mt-1 text-sm text-gray-400">
          Chọn font chữ áp dụng cho toàn bộ website. Font được tối ưu hoá qua Next.js và hỗ trợ tiếng Việt hoàn chỉnh.
        </p>
      </div>

      {/* Current state summary */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Font đang hoạt động</p>
            <p
              className="mt-1 text-3xl font-semibold text-white"
              style={{ fontFamily: `var(${FONT_REGISTRY[activeFont].cssVar}), system-ui` }}
            >
              {FONT_REGISTRY[activeFont].label}
            </p>
            <p className="mt-1 text-sm text-gray-400">{FONT_REGISTRY[activeFont].description}</p>
          </div>
          <div className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-right">
            <p className="font-mono text-xs text-gray-500">CSS Variable</p>
            <p className="font-mono text-sm text-green-400">var(--font-sans)</p>
            <p className="font-mono text-xs text-gray-600 mt-0.5">
              → var({FONT_REGISTRY[activeFont].cssVar})
            </p>
          </div>
        </div>

        {/* Typography scale preview */}
        <div className="mt-5 border-t border-gray-700 pt-5 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-3">Xem trước với tiếng Việt</p>
          <p className="text-3xl font-bold text-white">Hàng Gia Dụng Nội Địa Nhật Bản</p>
          <p className="text-xl font-semibold text-gray-200">Chất lượng thật, giá minh bạch, giao hàng toàn quốc</p>
          <p className="text-base text-gray-300 leading-relaxed">
            Japan VIP chuyên nhập khẩu và phân phối hàng gia dụng nội địa Nhật Bản chính hãng.
            Với đội ngũ chuyên nghiệp và kinh nghiệm lâu năm, chúng tôi cam kết mang đến
            những sản phẩm đặc trưng của đất nước Phù Tang — từ bếp từ, máy giặt đến
            thiết bị làm đẹp và đồ dùng gia đình cao cấp.
          </p>
          <p className="text-sm text-gray-400">
            Dấu tiếng Việt: Ẩm thực — Đặc sản — Thượng hạng — Phở bò — Cơm tấm — Bánh mì
          </p>
          <div className="flex gap-6 text-sm text-gray-500 pt-1">
            <span>Regular 400</span>
            <span className="font-medium text-gray-400">Medium 500</span>
            <span className="font-semibold text-gray-300">SemiBold 600</span>
            <span className="font-bold text-gray-200">Bold 700</span>
            <span className="font-extrabold text-gray-100">ExtraBold 800</span>
          </div>
        </div>
      </div>

      {/* Font picker */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-5 font-bold text-gray-200">Chọn Font</h2>
        <FontSwitcher fonts={fonts} activeFont={activeFont} />
      </div>

      {/* Technical info */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">Thông tin kỹ thuật</h3>
        <div className="grid grid-cols-1 gap-3 text-xs font-mono sm:grid-cols-2">
          <div className="space-y-1 text-gray-500">
            <p className="text-gray-400 font-sans font-medium not-italic text-xs mb-1">Kiến trúc CSS Variable</p>
            <p>html {'{'}</p>
            <p className="pl-4">--font-be-vietnam-pro: …; <span className="text-gray-600">/* next/font */</span></p>
            <p className="pl-4">--font-inter: …;</p>
            <p className="pl-4 text-green-500">--font-sans: var(--font-{activeFont}); <span className="text-gray-600">/* active */</span></p>
            <p>{'}'}</p>
            <p className="pt-1">body {'{'}</p>
            <p className="pl-4">font-family: var(--font-sans);</p>
            <p>{'}'}</p>
          </div>
          <div className="space-y-2 text-gray-500">
            <p className="text-gray-400 font-sans font-medium not-italic text-xs mb-1">Hiệu suất</p>
            <p>• next/font/google → self-hosted tại build</p>
            <p>• preload: true chỉ cho font active</p>
            <p>• display: swap → không block render</p>
            <p>• Redis cache 1h → 0 DB query/request</p>
            <p>• latin + latin-ext + vietnamese subset</p>
            <p>• CSP: font-src &apos;self&apos; tương thích</p>
          </div>
        </div>
      </div>
    </div>
  )
}
