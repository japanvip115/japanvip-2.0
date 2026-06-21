// Client-side Meta Pixel event helper.
// An toàn khi Pixel chưa cấu hình (window.fbq undefined) — chỉ no-op.

type FbqParams = {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  contents?: { id: string; quantity: number }[]
  value?: number
  currency?: string
  num_items?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function trackFb(event: string, params?: FbqParams) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('track', event, params)
  } catch {
    /* nuốt lỗi — tracking không bao giờ được làm vỡ UX */
  }
}

export const CURRENCY = 'VND'
