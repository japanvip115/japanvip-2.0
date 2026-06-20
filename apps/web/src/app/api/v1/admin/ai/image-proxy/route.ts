import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

// Block only internal/localhost — allow any external image host
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'japanvip.vn', 'store.japanvip.vn']

export async function GET(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
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

  const hostname = parsed.hostname
  const isBlocked = BLOCKED_HOSTS.some(h => hostname.includes(h))
  if (isBlocked) {
    return new Response('Host not allowed', { status: 403 })
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `https://${parsed.hostname}/`,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!res.ok) return new Response('Image fetch failed', { status: 502 })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

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
