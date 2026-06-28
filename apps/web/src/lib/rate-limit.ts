import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { getClientIp } from './get-client-ip'

type RateLimitConfig = { limit: number; windowSeconds: number }

const CONFIGS: Record<string, RateLimitConfig> = {
  'auth:login':      { limit: 5,  windowSeconds: 60 },
  'auth:register':   { limit: 3,  windowSeconds: 3600 },
  // OTP / khôi phục mật khẩu — siết để chống brute-force mã 6 số (trước đây rơi về default 60/phút)
  'auth:verify-email':    { limit: 8, windowSeconds: 600 },
  'auth:resend-otp':      { limit: 3, windowSeconds: 3600 },
  'auth:forgot-password': { limit: 5, windowSeconds: 3600 },
  'auth:reset-password':  { limit: 8, windowSeconds: 600 },
  'affiliate-otp':        { limit: 3, windowSeconds: 3600 },
  'bfj:parse-url':   { limit: 20, windowSeconds: 60 },
  'auction:bid':     { limit: 10, windowSeconds: 10 },
  'auction:max-bid': { limit: 5,  windowSeconds: 30 },
  'auction:watch':   { limit: 20, windowSeconds: 60 },
  'bid:otp':         { limit: 3,  windowSeconds: 60 },
  'admin:upload':    { limit: 30, windowSeconds: 60 },
  'upload:proof':    { limit: 10, windowSeconds: 3600 },
  'quick-order':     { limit: 5,  windowSeconds: 3600 },
  'quick-order-otp': { limit: 3,  windowSeconds: 3600 },
  'default':         { limit: 60, windowSeconds: 60 },
}

const limiters = new Map<string, Ratelimit>()

function getLimiter(action: string): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (limiters.has(action)) return limiters.get(action)!

  const config = CONFIGS[action] ?? CONFIGS['default']!
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
    prefix: `rate_limit:${action}`,
  })
  limiters.set(action, limiter)
  return limiter
}

export async function rateLimit(
  req: NextRequest,
  action: string,
  userId?: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = CONFIGS[action] ?? CONFIGS['default']!
  const now = Math.floor(Date.now() / 1000)

  try {
    const limiter = getLimiter(action)
    if (!limiter) return { allowed: true, remaining: config.limit, resetAt: now + config.windowSeconds }

    const identifier = userId ? `user:${userId}` : `ip:${getClientIp(req)}`
    const result = await limiter.limit(identifier)

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: Math.floor(result.reset / 1000),
    }
  } catch {
    return { allowed: true, remaining: config.limit, resetAt: now + config.windowSeconds }
  }
}
