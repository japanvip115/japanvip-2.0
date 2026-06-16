import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { testSmtpConnection } from '@/lib/email.service'

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { host, port, secure, user, pass, from } = await req.json()
    if (!host || !user || !pass) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin SMTP (host, user, pass)' }, { status: 400 })
    }

    await testSmtpConnection({ host, port: port ?? 465, secure: secure ?? true, user, pass, from: from ?? `Japan VIP <${user}>` })
    return NextResponse.json({ success: true, message: 'Kết nối SMTP thành công!' })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Không thể kết nối SMTP',
    }, { status: 400 })
  }
}
