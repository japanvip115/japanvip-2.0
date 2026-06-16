import { NextRequest } from 'next/server'

function isValidIp(ip: string): boolean {
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split('.').every((n) => parseInt(n) <= 255)
  }
  // IPv6
  if (/^[0-9a-f:]{2,39}$/i.test(ip)) return true
  return false
}

/**
 * Extract real client IP — trust Cloudflare CF-Connecting-IP first,
 * then first value of X-Forwarded-For. Validates format to prevent spoofing.
 */
export function getClientIp(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf && isValidIp(cf.trim())) return cf.trim()

  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (xff && isValidIp(xff)) return xff

  return 'unknown'
}
