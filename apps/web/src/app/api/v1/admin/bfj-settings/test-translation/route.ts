import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { translateProductName } from '@/modules/bfj/services/translate.service'

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 })

    const translated = await translateProductName(text)
    const changed = translated !== text

    return NextResponse.json({
      success: true,
      translated,
      changed,
      ...(changed ? {} : { note: 'API key chưa đúng hoặc provider chưa được cấu hình' }),
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định',
    }, { status: 500 })
  }
}
