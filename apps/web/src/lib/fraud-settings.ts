/**
 * Fraud Settings — toggle từng rule qua SiteSetting (key prefix "fraud.").
 * Cache 30s để không query DB mỗi bid.
 */

import { prisma } from '@japanvip/db'

const CACHE_TTL = 30_000
let cache: Record<string, string> | null = null
let cacheAt = 0

export const FRAUD_DEFAULTS: Record<string, string> = {
  SAME_IP_PREBID:               'true',
  SAME_IP_MULTI_ACCOUNT:        'true',
  BID_SPIKE:                    'true',
  NEW_ACCOUNT_HIGH_BID:         'true',
  BID_VELOCITY:                 'true',
  BID_VELOCITY_MAX:             '10',
  ANTI_SNIPING:                 'true',
  OTP_HIGH_VALUE:               'false',      // tắt mặc định — cần cấu hình email OTP
  BID_OTP_THRESHOLD:            '500000000',  // 500 triệu VNĐ
  DEVICE_MULTI_ACCOUNT:         'true',
  SHILL_BID:                    'true',
  COOLING_OFF:                  'false',
  COOLING_OFF_DAYS:             '7',

  FRAUD_SCORE_SUSPEND:          'true',
  FRAUD_SCORE_THRESHOLD:        '150',
  FRAUD_SCORE_BLOCK_THRESHOLD:  '60',

  FRAUD_WEIGHT_SAME_IP_MULTI_ACCOUNT: '30',
  FRAUD_WEIGHT_BID_SPIKE:             '20',
  FRAUD_WEIGHT_NEW_ACCOUNT_HIGH_BID:  '40',
  FRAUD_WEIGHT_SHILL_BID:             '25',
  FRAUD_WEIGHT_DEVICE_MULTI_ACCOUNT:  '50',
  FRAUD_WEIGHT_SAME_IP_PREBID:        '60',
}

async function loadSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { startsWith: 'fraud.' } },
    })
    const loaded = Object.fromEntries(rows.map((r) => [r.key.slice(6), r.value]))
    cache = { ...FRAUD_DEFAULTS, ...loaded }
    cacheAt = Date.now()
    return cache
  } catch {
    return FRAUD_DEFAULTS
  }
}

export async function isFraudRuleEnabled(rule: string): Promise<boolean> {
  const s = await loadSettings()
  return s[rule] !== 'false'
}

export async function getFraudSetting(key: string): Promise<string> {
  const s = await loadSettings()
  return s[key] ?? FRAUD_DEFAULTS[key] ?? ''
}

export function invalidateFraudCache() {
  cache = null
  cacheAt = 0
}

export async function writeAuditLog(data: {
  eventType: string
  userId?: string
  detail?: Record<string, unknown>
  ipAddress?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.eventType,
        resourceType: 'auction',
        userId: data.userId,
        newValues: data.detail ? (data.detail as object) : undefined,
        ipAddress: data.ipAddress ?? undefined,
      },
    })
  } catch {
    // Audit log không được crash luồng chính
  }
}

export const FRAUD_RULE_META = [
  {
    key: 'SAME_IP_PREBID',
    label: 'Chặn cùng IP khác tài khoản',
    description: 'Từ chối bid nếu cùng IP đã đặt từ tài khoản khác trong phiên — ngăn self-bidding',
    category: 'block',
  },
  {
    key: 'SAME_IP_MULTI_ACCOUNT',
    label: 'Flag nhiều tài khoản cùng IP',
    description: 'Đánh dấu nghi ngờ khi 2+ tài khoản dùng cùng IP trong 1 phiên đấu giá',
    category: 'flag',
  },
  {
    key: 'BID_SPIKE',
    label: 'Phát hiện bid tăng đột biến',
    description: 'Flag khi bid tăng >50% so với bid liền trước trong vòng 1 giây',
    category: 'flag',
  },
  {
    key: 'NEW_ACCOUNT_HIGH_BID',
    label: 'Cảnh báo tài khoản mới bid cao',
    description: 'Flag tài khoản <24h tuổi đặt giá >5× giá khởi điểm ngay lần đầu',
    category: 'flag',
  },
  {
    key: 'BID_VELOCITY',
    label: 'Giới hạn tốc độ đặt giá',
    description: 'Chặn bot/script — giới hạn số bid mỗi phút (mặc định 10)',
    category: 'block',
    thresholdKey: 'BID_VELOCITY_MAX',
    thresholdLabel: 'Tối đa N bid / phút',
    thresholdDefault: '10',
  },
  {
    key: 'SHILL_BID',
    label: 'Phát hiện shill bidding',
    description: 'Flag khi 1 tài khoản đặt giá lặp lại ≥3 lần trong 30 giây',
    category: 'flag',
  },
  {
    key: 'DEVICE_MULTI_ACCOUNT',
    label: 'Flag nhiều tài khoản cùng thiết bị',
    description: 'Đánh dấu nghi ngờ khi 2+ tài khoản dùng cùng device fingerprint trong 1 phiên',
    category: 'flag',
  },
  {
    key: 'OTP_HIGH_VALUE',
    label: 'OTP xác nhận bid lớn',
    description: 'Yêu cầu mã OTP email cho lệnh bid vượt ngưỡng giá trị',
    category: 'protection',
    thresholdKey: 'BID_OTP_THRESHOLD',
    thresholdLabel: 'Ngưỡng giá (VNĐ)',
    thresholdDefault: '500000000',
  },
  {
    key: 'FRAUD_SCORE_SUSPEND',
    label: 'Tự động khóa khi vượt ngưỡng điểm gian lận',
    description: 'Cộng dồn điểm mỗi lần bid bị flag; vượt ngưỡng → khóa tài khoản',
    category: 'block',
    thresholdKey: 'FRAUD_SCORE_THRESHOLD',
    thresholdLabel: 'Ngưỡng điểm khóa',
    thresholdDefault: '150',
  },
] as const
