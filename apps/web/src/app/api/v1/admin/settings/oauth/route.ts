import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { encryptIfNeeded, decryptIfNeeded } from '@/lib/encrypt'

function mask(value: string | null | undefined): string {
  if (!value) return ''
  const plain = decryptIfNeeded(value) ?? value
  if (plain.length <= 8) return '••••••••'
  return plain.slice(0, 6) + '•'.repeat(plain.length - 10) + plain.slice(-4)
}

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ['google_client_id', 'google_client_secret'] } },
  })

  const idRow = rows.find((r) => r.key === 'google_client_id')
  const secretRow = rows.find((r) => r.key === 'google_client_secret')

  return NextResponse.json({
    success: true,
    data: {
      clientIdConfigured: !!idRow?.value,
      clientSecretConfigured: !!secretRow?.value,
      clientIdMasked: mask(idRow?.value),
      clientSecretMasked: mask(secretRow?.value),
    },
  })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { clientId, clientSecret } = body as { clientId?: string; clientSecret?: string }

  const isMasked = (v: string | undefined) => typeof v === 'string' && v.includes('•')

  const ops: Promise<unknown>[] = []

  if (clientId && !isMasked(clientId)) {
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: 'google_client_id' },
        create: { key: 'google_client_id', value: clientId.trim() },
        update: { value: clientId.trim() },
      })
    )
  }

  if (clientSecret && !isMasked(clientSecret)) {
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: 'google_client_secret' },
        create: { key: 'google_client_secret', value: encryptIfNeeded(clientSecret.trim()) ?? clientSecret.trim() },
        update: { value: encryptIfNeeded(clientSecret.trim()) ?? clientSecret.trim() },
      })
    )
  }

  if (ops.length === 0) {
    return NextResponse.json({ success: false, error: 'Không có dữ liệu thay đổi' }, { status: 400 })
  }

  await Promise.all(ops)

  return NextResponse.json({ success: true })
}
