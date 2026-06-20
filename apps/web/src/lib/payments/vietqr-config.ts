import { prisma } from '@japanvip/db'

export type VietQRConfig = {
  bankId: string
  accountNo: string
  accountName: string
  enabled: boolean
}

export const VIETQR_KEYS = {
  bankId: 'payment.vietqr.bank_id',
  accountNo: 'payment.vietqr.account_no',
  accountName: 'payment.vietqr.account_name',
  enabled: 'payment.vietqr.enabled',
}

export async function getVietQRConfig(): Promise<VietQRConfig | null> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.vietqr.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const bankId = map.get(VIETQR_KEYS.bankId) ?? ''
  const accountNo = map.get(VIETQR_KEYS.accountNo) ?? ''
  const accountName = map.get(VIETQR_KEYS.accountName) ?? ''
  if (!bankId || !accountNo) return null
  return {
    bankId,
    accountNo,
    accountName,
    enabled: map.get(VIETQR_KEYS.enabled) !== 'false',
  }
}

export async function getVietQRConfigStatus() {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: 'payment.vietqr.' } } })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    bankId: map.get(VIETQR_KEYS.bankId) ?? '',
    accountNo: map.get(VIETQR_KEYS.accountNo) ?? '',
    accountName: map.get(VIETQR_KEYS.accountName) ?? '',
    enabled: map.get(VIETQR_KEYS.enabled) !== 'false',
  }
}

export async function saveVietQRConfig(input: Partial<VietQRConfig>) {
  const upserts: { key: string; value: string }[] = []
  if (input.bankId !== undefined) upserts.push({ key: VIETQR_KEYS.bankId, value: input.bankId.trim() })
  if (input.accountNo !== undefined) upserts.push({ key: VIETQR_KEYS.accountNo, value: input.accountNo.trim() })
  if (input.accountName !== undefined) upserts.push({ key: VIETQR_KEYS.accountName, value: input.accountName.trim() })
  if (input.enabled !== undefined) upserts.push({ key: VIETQR_KEYS.enabled, value: input.enabled ? 'true' : 'false' })
  for (const u of upserts) {
    await prisma.siteSetting.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
  }
}

/** Sinh URL ảnh QR VietQR (img.vietqr.io — không cần API key). */
export function buildVietQRUrl({
  bankId,
  accountNo,
  accountName,
  amount,
  addInfo,
}: {
  bankId: string
  accountNo: string
  accountName: string
  amount?: number
  addInfo?: string
}) {
  const base = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg`
  const params = new URLSearchParams()
  if (amount) params.set('amount', String(Math.round(amount)))
  if (addInfo) params.set('addInfo', addInfo)
  if (accountName) params.set('accountName', accountName)
  return `${base}?${params.toString()}`
}
