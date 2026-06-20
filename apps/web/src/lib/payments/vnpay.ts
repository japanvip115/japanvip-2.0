import crypto from 'crypto'
import type { VnpayConfig } from './vnpay-config'

/** Encode + sort params theo chuẩn VNPay (encodeURIComponent, space → '+'). */
function buildSignData(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k]!).replace(/%20/g, '+')}`)
    .join('&')
}

function hmacSha512(secret: string, data: string): string {
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex')
}

/** Format thời gian yyyyMMddHHmmss theo giờ Asia/Ho_Chi_Minh (UTC+7). */
export function vnpDate(date: Date): string {
  const tz = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    tz.getUTCFullYear().toString() +
    p(tz.getUTCMonth() + 1) +
    p(tz.getUTCDate()) +
    p(tz.getUTCHours()) +
    p(tz.getUTCMinutes()) +
    p(tz.getUTCSeconds())
  )
}

export type BuildUrlParams = {
  amount: number
  txnRef: string
  orderInfo: string
  ipAddr: string
  createDate: string
  expireDate: string
}

export function buildPaymentUrl(config: VnpayConfig, params: BuildUrlParams): string {
  const data: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: params.createDate,
    vnp_ExpireDate: params.expireDate,
  }
  const signData = buildSignData(data)
  const secureHash = hmacSha512(config.hashSecret, signData)
  return `${config.payUrl}?${signData}&vnp_SecureHash=${secureHash}`
}

/** Xác thực chữ ký callback/IPN. So sánh hằng thời gian để chống timing attack. */
export function verifySignature(config: VnpayConfig, query: Record<string, string>): boolean {
  const received = query.vnp_SecureHash
  if (!received) return false
  const rest: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    if (k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') continue
    rest[k] = v
  }
  const signData = buildSignData(rest)
  const expected = hmacSha512(config.hashSecret, signData)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}
