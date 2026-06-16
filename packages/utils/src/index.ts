// Format Vietnamese currency
export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num)
}

// Format Japanese Yen
export function formatJPY(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(num)
}

// Generate order/auction number
export function generateOrderNumber(prefix: string, counter: number): string {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(counter).padStart(6, '0')}`
}

// Slugify Vietnamese text
export function slugify(text: string): string {
  const map: Record<string, string> = {
    à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
    ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    â: 'a', ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
    ê: 'e', ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
    ô: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
    ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
    đ: 'd',
  }

  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Paginate array helper
export function paginate<T>(items: T[], page: number, limit: number): {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
} {
  const total = items.length
  const totalPages = Math.ceil(total / limit)
  const data = items.slice((page - 1) * limit, page * limit)
  return { data, total, page, limit, totalPages }
}

// Detect BFJ source platform from URL
export function detectBfjPlatform(url: string): string {
  if (url.includes('amazon.co.jp')) return 'AMAZON_JP'
  if (url.includes('rakuten.co.jp')) return 'RAKUTEN'
  if (url.includes('mercari.com')) return 'MERCARI'
  if (url.includes('shopping.yahoo.co.jp')) return 'YAHOO_SHOPPING'
  return 'OTHER'
}
