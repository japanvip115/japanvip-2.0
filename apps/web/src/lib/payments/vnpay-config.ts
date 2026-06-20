import { prisma } from '@japanvip/db'
import { encrypt, decrypt } from '@/lib/encrypt'

export type VnpayConfig = {
  tmnCode: string
  hashSecret: string
  payUrl: string
  returnUrl: string
  enabled: boolean
}

export const VNPAY_KEYS = {
  tmnCode: 'payment.vnpay.tmn_code',
  hashSecret: 'payment.vnpay.hash_secret', // encrypted
  payUrl: 'payment.vnpay.pay_url',
  returnUrl: 'payment.vnpay.return_url',
  enabled: 'payment.vnpay.enabled',
}

const DEFAULT_PAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'

/** Lấy config VNPay đã giải mã. Trả null nếu chưa cấu hình đủ (thiếu tmnCode/hashSecret). */
export async function getVnpayConfig(): Promise<VnpayConfig | null> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.vnpay.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const tmnCode = map.get(VNPAY_KEYS.tmnCode) ?? ''
  let hashSecret = ''
  const hashRaw = map.get(VNPAY_KEYS.hashSecret)
  if (hashRaw) { try { hashSecret = decrypt(hashRaw) } catch { hashSecret = '' } }

  if (!tmnCode || !hashSecret) return null

  return {
    tmnCode,
    hashSecret,
    payUrl: map.get(VNPAY_KEYS.payUrl) || DEFAULT_PAY_URL,
    returnUrl: map.get(VNPAY_KEYS.returnUrl) ?? '',
    enabled: map.get(VNPAY_KEYS.enabled) === 'true',
  }
}

/** Trạng thái cấu hình cho admin UI (không lộ secret). */
export async function getVnpayConfigStatus() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.vnpay.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    tmnCode: map.get(VNPAY_KEYS.tmnCode) ?? '',
    hasHashSecret: !!map.get(VNPAY_KEYS.hashSecret),
    payUrl: map.get(VNPAY_KEYS.payUrl) || DEFAULT_PAY_URL,
    returnUrl: map.get(VNPAY_KEYS.returnUrl) ?? '',
    enabled: map.get(VNPAY_KEYS.enabled) === 'true',
  }
}

export async function saveVnpayConfig(input: {
  tmnCode?: string
  hashSecret?: string
  payUrl?: string
  returnUrl?: string
  enabled?: boolean
}) {
  const upserts: { key: string; value: string }[] = []
  if (input.tmnCode !== undefined) upserts.push({ key: VNPAY_KEYS.tmnCode, value: input.tmnCode.trim() })
  if (input.hashSecret) upserts.push({ key: VNPAY_KEYS.hashSecret, value: encrypt(input.hashSecret.trim()) })
  if (input.payUrl !== undefined) upserts.push({ key: VNPAY_KEYS.payUrl, value: input.payUrl.trim() })
  if (input.returnUrl !== undefined) upserts.push({ key: VNPAY_KEYS.returnUrl, value: input.returnUrl.trim() })
  if (input.enabled !== undefined) upserts.push({ key: VNPAY_KEYS.enabled, value: input.enabled ? 'true' : 'false' })

  for (const u of upserts) {
    await prisma.siteSetting.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value },
    })
  }
}
