import { getVietQRConfig } from '@/lib/payments/vietqr-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getVietQRConfig()
  if (!config || !config.enabled) {
    return Response.json({ enabled: false })
  }
  return Response.json({
    enabled: true,
    bankId: config.bankId,
    accountNo: config.accountNo,
    accountName: config.accountName,
  })
}
