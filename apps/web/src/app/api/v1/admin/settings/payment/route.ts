import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getVnpayConfigStatus, saveVnpayConfig } from '@/lib/payments/vnpay-config'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const vnpay = await getVnpayConfigStatus()
  return Response.json({ vnpay })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  await saveVnpayConfig({
    tmnCode: body.tmnCode,
    hashSecret: body.hashSecret || undefined, // chỉ cập nhật khi nhập mới
    payUrl: body.payUrl,
    returnUrl: body.returnUrl,
    enabled: body.enabled,
  })
  return Response.json({ success: true })
}
