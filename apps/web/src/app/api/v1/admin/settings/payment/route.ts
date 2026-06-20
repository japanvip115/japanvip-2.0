import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getVnpayConfigStatus, saveVnpayConfig } from '@/lib/payments/vnpay-config'
import { getVietQRConfigStatus, saveVietQRConfig } from '@/lib/payments/vietqr-config'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [vnpay, vietqr] = await Promise.all([getVnpayConfigStatus(), getVietQRConfigStatus()])
  return Response.json({ vnpay, vietqr })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()

  if (body.gateway === 'vietqr') {
    await saveVietQRConfig({
      bankId: body.bankId,
      accountNo: body.accountNo,
      accountName: body.accountName,
      enabled: body.enabled,
    })
  } else {
    await saveVnpayConfig({
      tmnCode: body.tmnCode,
      hashSecret: body.hashSecret || undefined,
      payUrl: body.payUrl,
      returnUrl: body.returnUrl,
      enabled: body.enabled,
    })
  }

  return Response.json({ success: true })
}
