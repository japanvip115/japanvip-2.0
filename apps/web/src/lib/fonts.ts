import {
  Be_Vietnam_Pro,
  Inter,
  Noto_Sans,
  Roboto,
  Open_Sans,
  Montserrat,
} from 'next/font/google'

export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})

export const inter = Inter({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

export const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

export const roboto = Roboto({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

export const montserrat = Montserrat({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

export const openSans = Open_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-open-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

// ─── Font Registry ────────────────────────────────────────────────────────────

export type FontKey = 'be-vietnam-pro' | 'inter' | 'noto-sans' | 'roboto' | 'open-sans' | 'myriad-pro'

export const DEFAULT_FONT: FontKey = 'be-vietnam-pro'

export type FontMeta = {
  key: FontKey
  label: string
  cssVar: string
  specimen: string
  description: string
}

export const FONT_REGISTRY: Record<FontKey, FontMeta> = {
  'be-vietnam-pro': {
    key: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    cssVar: '--font-be-vietnam-pro',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Được tối ưu cho tiếng Việt. Hiện đại, sạch và dễ đọc.',
  },
  'inter': {
    key: 'inter',
    label: 'Inter',
    cssVar: '--font-inter',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Font phổ biến cho UI. Số và ký tự kỹ thuật rõ ràng.',
  },
  'noto-sans': {
    key: 'noto-sans',
    label: 'Noto Sans',
    cssVar: '--font-noto-sans',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Hỗ trợ đa ngôn ngữ xuất sắc. Lý tưởng cho nội dung quốc tế.',
  },
  'roboto': {
    key: 'roboto',
    label: 'Roboto',
    cssVar: '--font-roboto',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Font của Google Material Design. Thân thiện và quen thuộc.',
  },
  'open-sans': {
    key: 'open-sans',
    label: 'Open Sans',
    cssVar: '--font-open-sans',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Tỉ lệ x-height cao, dễ đọc ở cỡ nhỏ. Trung tính và chuyên nghiệp.',
  },
  'myriad-pro': {
    key: 'myriad-pro',
    label: 'Myriad Pro',
    cssVar: '--font-myriad-pro',
    specimen: 'Tiếng Việt: Thưở ấy, đất nước tươi đẹp. 0123 ABCDE',
    description: 'Font cao cấp của Adobe — sang trọng, hiện đại. Cùng font Toshiba Lifestyle dùng.',
  },
}

export function getAllFontVariableClasses(): string {
  return [
    beVietnamPro.variable,
    inter.variable,
    notoSans.variable,
    roboto.variable,
    openSans.variable,
    montserrat.variable,
  ].join(' ')
}

export function getFontCssVar(key: FontKey): string {
  return FONT_REGISTRY[key]?.cssVar ?? FONT_REGISTRY[DEFAULT_FONT].cssVar
}
