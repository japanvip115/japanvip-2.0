import { NextRequest } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { redisLPushCapped } from '@/lib/redis'
import { RUM_KEY, RUM_CAP, RUM_METRICS, normalizePath, parseDevice, parseBrowser, type RumSampleRaw } from '@/lib/rum'

export const runtime = 'nodejs'

const schema = z.object({
  metric: z.enum(RUM_METRICS),
  value: z.number().finite().min(0).max(3_600_000),
  path: z.string().max(300).optional(),
  connection: z.string().max(12).optional(),
})

// Thu Core Web Vitals từ trình duyệt khách (gửi qua navigator.sendBeacon).
// Công khai (mọi khách gọi được) nên: validate chặt, rate-limit, lưu giới hạn.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, 'vitals')
  if (!rl.allowed) return new Response(null, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 204 }) // beacon hỏng → bỏ qua im lặng
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return new Response(null, { status: 204 })
  const { metric, value, path, connection } = parsed.data

  const ua = req.headers.get('user-agent') ?? ''
  const country =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    'XX'

  const sample: RumSampleRaw = {
    m: metric,
    v: Math.round(value * 1000) / 1000,
    p: normalizePath(path ?? '/'),
    d: parseDevice(ua),
    b: parseBrowser(ua),
    c: (country || 'XX').slice(0, 2).toUpperCase(),
    n: (connection || '').slice(0, 12),
    t: Date.now(),
  }

  await redisLPushCapped(RUM_KEY, JSON.stringify(sample), RUM_CAP)
  return new Response(null, { status: 204 })
}
