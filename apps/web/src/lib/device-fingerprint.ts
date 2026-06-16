/**
 * Device fingerprint — phát hiện 1 thiết bị dùng nhiều tài khoản đấu giá.
 * Client-side: cache vào localStorage. Server-side: trả "".
 */

const STORAGE_KEY = 'jvip_device_fp'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

function canvasSignature(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 40
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = '#e63946'
    ctx.fillRect(10, 5, 80, 20)
    ctx.fillStyle = '#1d3557'
    ctx.fillText('JapanVIP-Auction-FP', 12, 8)
    ctx.fillStyle = 'rgba(102,204,0,0.7)'
    ctx.fillText('JapanVIP-Auction-FP', 14, 10)
    return canvas.toDataURL()
  } catch {
    return 'canvas-error'
  }
}

/** Server-side: kiểm tra fingerprint có đủ entropy không. */
export function validateFingerprintServer(fp: string | null | undefined): boolean {
  if (!fp || fp.length !== 32) return false
  if (!/^[0-9a-f]{32}$/.test(fp)) return false
  const uniqueChars = new Set(fp.split('')).size
  if (uniqueChars < 12) return false
  const firstHalf = fp.slice(0, 16)
  const secondHalf = fp.slice(16)
  if (firstHalf === secondHalf) return false
  return true
}

/** Client-side: lấy fingerprint (32 ký tự hex), cache localStorage. */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached && cached.length === 32) return cached

    const parts = [
      navigator.userAgent,
      navigator.language,
      (navigator.languages || []).join(','),
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(new Date().getTimezoneOffset()),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(navigator.hardwareConcurrency || ''),
      String(((navigator as unknown) as Record<string, unknown>)['deviceMemory'] || ''),
      String(navigator.maxTouchPoints || 0),
      canvasSignature(),
    ]

    const fp = await sha256Hex(parts.join('|'))
    try { localStorage.setItem(STORAGE_KEY, fp) } catch { /* private mode */ }
    return fp
  } catch {
    return ''
  }
}
