// Lớp tracking hợp nhất — bắn song song Meta Pixel (fbq) + Google Analytics 4 (gtag).
// An toàn khi chưa cấu hình (window.fbq / window.gtag undefined) → no-op, không bao giờ làm vỡ UX.

export const CURRENCY = 'VND'

type Item = { id: string; name?: string; quantity?: number; price?: number }

type TrackInput = {
  ids: string[]
  name?: string
  items?: Item[]
  value?: number | null
  numItems?: number
  transactionId?: string
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

function fbq(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try { window.fbq('track', event, params) } catch { /* noop */ }
}

function gtag(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try { window.gtag('event', event, params) } catch { /* noop */ }
}

// GA4 items[] từ input
function gaItems(input: TrackInput): { item_id: string; item_name?: string; quantity?: number; price?: number }[] {
  if (input.items?.length) {
    return input.items.map(i => ({
      item_id: i.id,
      ...(i.name ? { item_name: i.name } : {}),
      ...(i.quantity ? { quantity: i.quantity } : {}),
      ...(i.price ? { price: i.price } : {}),
    }))
  }
  return input.ids.map(id => ({ item_id: id, ...(input.name ? { item_name: input.name } : {}) }))
}

// Meta contents[] từ input
function fbContents(input: TrackInput) {
  if (input.items?.length) return input.items.map(i => ({ id: i.id, quantity: i.quantity ?? 1 }))
  return input.ids.map(id => ({ id, quantity: 1 }))
}

const money = (v: number | null | undefined) =>
  v != null && v > 0 ? { value: v, currency: CURRENCY } : {}

export function trackViewItem(input: TrackInput) {
  fbq('ViewContent', { content_ids: input.ids, content_name: input.name, content_type: 'product', ...money(input.value) })
  gtag('view_item', { ...money(input.value), items: gaItems(input) })
}

export function trackAddToCart(input: TrackInput) {
  fbq('AddToCart', { content_ids: input.ids, content_name: input.name, content_type: 'product', contents: fbContents(input), ...money(input.value) })
  gtag('add_to_cart', { ...money(input.value), items: gaItems(input) })
}

export function trackViewCart(input: TrackInput) {
  fbq('ViewCart', { content_ids: input.ids, content_type: 'product', contents: fbContents(input), num_items: input.numItems, ...money(input.value) })
  gtag('view_cart', { ...money(input.value), items: gaItems(input) })
}

export function trackBeginCheckout(input: TrackInput) {
  fbq('InitiateCheckout', { content_ids: input.ids, content_name: input.name, content_type: 'product', num_items: input.numItems, ...money(input.value) })
  gtag('begin_checkout', { ...money(input.value), items: gaItems(input) })
}

export function trackPurchase(input: TrackInput) {
  fbq('Purchase', {
    content_ids: input.ids, content_name: input.name, content_type: 'product',
    contents: fbContents(input), num_items: input.numItems,
    ...(money(input.value).value ? money(input.value) : { currency: CURRENCY }),
  })
  gtag('purchase', {
    ...(input.transactionId ? { transaction_id: input.transactionId } : {}),
    ...(money(input.value).value ? money(input.value) : { currency: CURRENCY }),
    items: gaItems(input),
  })
}
