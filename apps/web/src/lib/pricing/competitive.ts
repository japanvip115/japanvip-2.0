// Logic định giá cạnh tranh — bám shopnoidianhat + biên tuyệt đối 500k–900k.
// Thuần (không I/O) để dễ test & tái dùng. Xem docs/pricing/PLAN-gia-canh-tranh.md.

export interface MarkupConfig {
  markupMinVnd: number // biên tối thiểu cộng trên mốc (shopnoidianhat)
  markupMaxVnd: number // biên tối đa
  markupDefaultVnd: number // biên mặc định để sinh giá đề xuất
  roundToVnd: number // làm tròn giá đề xuất tới bội số này
}

export const DEFAULT_MARKUP: MarkupConfig = {
  markupMinVnd: 500_000,
  markupMaxVnd: 900_000,
  markupDefaultVnd: 700_000,
  roundToVnd: 10_000,
}

export type PriceFlagCode = 'above_band' | 'below_band' | 'anchor_off_market' | 'no_anchor'
export type PriceFlagLevel = 'red' | 'orange' | 'warn'

export interface PriceFlag {
  level: PriceFlagLevel
  code: PriceFlagCode
  message: string
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value)
  return Math.round(value / step) * step
}

// Giá đề xuất = mốc + biên mặc định, làm tròn, kẹp trong [mốc+min, mốc+max].
export function suggestPrice(anchorVnd: number, cfg: MarkupConfig = DEFAULT_MARKUP): number {
  const low = anchorVnd + cfg.markupMinVnd
  const high = anchorVnd + cfg.markupMaxVnd
  const raw = roundTo(anchorVnd + cfg.markupDefaultVnd, cfg.roundToVnd)
  return Math.min(Math.max(raw, low), high)
}

// Cờ cảnh báo dựa trên giá hiện tại vs dải quanh mốc.
export function priceFlags(params: {
  yourPrice: number | null
  anchorVnd: number | null
  cfg?: MarkupConfig
  refMedianVnd?: number | null
}): PriceFlag[] {
  const cfg = params.cfg ?? DEFAULT_MARKUP
  const flags: PriceFlag[] = []

  if (params.anchorVnd == null) {
    flags.push({ level: 'warn', code: 'no_anchor', message: 'Thiếu mốc shopnoidianhat — cần dán link hoặc lấy giá' })
    return flags
  }

  const low = params.anchorVnd + cfg.markupMinVnd
  const high = params.anchorVnd + cfg.markupMaxVnd

  if (params.yourPrice != null) {
    if (params.yourPrice > high) {
      flags.push({
        level: 'red',
        code: 'above_band',
        message: `Đắt hơn shopnoidianhat quá ${fmtVnd(cfg.markupMaxVnd)} — khách dễ đặt thẳng HN, nên giảm`,
      })
    } else if (params.yourPrice < low) {
      flags.push({
        level: 'orange',
        code: 'below_band',
        message: `Chênh mốc dưới ${fmtVnd(cfg.markupMinVnd)} — đang để rẻ, có thể tăng`,
      })
    }
  }

  if (params.refMedianVnd != null && params.refMedianVnd > 0) {
    const dev = Math.abs(params.anchorVnd - params.refMedianVnd) / params.refMedianVnd
    if (dev > 0.15) {
      flags.push({
        level: 'warn',
        code: 'anchor_off_market',
        message: 'shopnoidianhat lệch thị trường >15% — xem lại trước khi bám',
      })
    }
  }

  return flags
}

export function jpyToVnd(priceJpy: number, jpyVndRate: number): number {
  return Math.round(priceJpy * jpyVndRate)
}

// % chênh lệch nhập khẩu: VN đắt hơn giá gốc Nhật bao nhiêu %.
export function importMarkupPct(vnPriceVnd: number, japanPriceVnd: number): number | null {
  if (!japanPriceVnd || japanPriceVnd <= 0) return null
  return ((vnPriceVnd - japanPriceVnd) / japanPriceVnd) * 100
}

export function median(nums: number[]): number | null {
  const xs = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n)).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2
}

function fmtVnd(vnd: number): string {
  return vnd.toLocaleString('vi-VN') + 'đ'
}
