import { Redis } from '@upstash/redis'

// Upstash Redis — serverless HTTP client (Vercel compatible)
// Falls back gracefully when env vars are missing (local dev without Redis)

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

export const CACHE_TTL = {
  AUCTION_STATE: 5,
  AUCTION_BIDS: 10,
  EXCHANGE_RATE: 300,
  PRODUCT: 3600,
  USER_WALLET: 60,
  SESSION: 604800,
} as const

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis()
    if (!r) return null
    const raw = await r.get<string>(key)
    if (!raw) return null
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const r = getRedis()
    if (!r) return
    await r.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Redis unavailable — skip caching
  }
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    const r = getRedis()
    if (!r || keys.length === 0) return
    await r.del(...keys)
  } catch {
    // Redis unavailable — skip
  }
}

// Low-level helpers for callers that need raw get/set/del without JSON wrapping
export async function redisGet(key: string): Promise<string | null> {
  try {
    const r = getRedis()
    if (!r) return null
    return await r.get<string>(key)
  } catch { return null }
}

export async function redisSet(key: string, value: string, exSeconds?: number): Promise<void> {
  try {
    const r = getRedis()
    if (!r) return
    if (exSeconds) await r.setex(key, exSeconds, value)
    else await r.set(key, value)
  } catch { /* skip */ }
}

// Distributed lock: SET key value PX ms NX
export async function redisSetNX(key: string, value: string, ttlMs: number): Promise<boolean> {
  try {
    const r = getRedis()
    if (!r) return true // no Redis → allow (fail open)
    const result = await r.set(key, value, { px: ttlMs, nx: true })
    return result === 'OK'
  } catch { return true }
}

// Push lên đầu list rồi cắt giữ N phần tử mới nhất (cho RUM samples). Fire-and-forget.
export async function redisLPushCapped(key: string, value: string, cap: number): Promise<void> {
  try {
    const r = getRedis()
    if (!r) return
    await r.lpush(key, value)
    await r.ltrim(key, 0, cap - 1)
  } catch { /* skip */ }
}

export async function redisLRange(key: string, start: number, stop: number): Promise<string[]> {
  try {
    const r = getRedis()
    if (!r) return []
    return await r.lrange<string>(key, start, stop)
  } catch { return [] }
}

export const CacheKey = {
  auctionState: (id: string) => `auction:${id}:state`,
  auctionBids: (id: string) => `auction:${id}:bids`,
  exchangeRate: (from: string, to: string) => `exchange_rate:${from}:${to}`,
  product: (id: string) => `product:${id}`,
  userWallet: (id: string) => `user:${id}:wallet`,
  auctionChannel: (id: string) => `auction:${id}:events`,
} as const
