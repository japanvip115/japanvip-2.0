import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

const MAX_BYTES = 15 * 1024 * 1024 // 15MB

// Chặn host nội bộ / IP private / link-local (cloud metadata 169.254.169.254) → chống SSRF.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h === 'japanvip.vn' || h.endsWith('.japanvip.vn')) return true // chặn tự gọi vòng nội bộ
  // IPv6 loopback / ULA (fc00::/7) / link-local (fe80::/10)
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true
  // IPv4 literal: loopback / private / link-local / CGNAT
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const a = +m[1]!, b = +m[2]!
    if (a === 0 || a === 127 || a === 10) return true
    if (a === 169 && b === 254) return true // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }
  return false
}

export async function GET(req: Request) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const imageUrl = searchParams.get('url')
  if (!imageUrl) return new Response('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('Scheme not allowed', { status: 403 })
  }
  if (isBlockedHost(parsed.hostname)) {
    return new Response('Host not allowed', { status: 403 })
  }

  try {
    const res = await fetch(imageUrl, {
      redirect: 'error', // chặn redirect tới host nội bộ (bypass SSRF)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `https://${parsed.hostname}/`,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!res.ok) return new Response('Image fetch failed', { status: 502 })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return new Response('Not an image', { status: 502 })
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return new Response('Image too large', { status: 502 })
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new Response('Proxy error', { status: 502 })
  }
}
