import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { encryptIfNeeded, decryptIfNeeded } from '@/lib/encrypt'

function maskSecret(value: string | null | undefined): string {
  if (!value) return ''
  const plain = decryptIfNeeded(value) ?? ''
  return '•'.repeat(Math.max(0, plain.length - 4)) + plain.slice(-4)
}

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const setting = await prisma.bfjSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  })

  return NextResponse.json({
    success: true,
    data: {
      ...setting,
      translationApiKey: maskSecret(setting.translationApiKey),
      smtpPass: maskSecret(setting.smtpPass),
    },
  })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      serviceFeeRate, domesticShippingJpy, surchargeRate, depositRate,
      translationProvider, translationApiKey,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure,
    } = body

    const isMasked = (v: string | undefined) => typeof v === 'string' && v.includes('•')

    await prisma.bfjSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        serviceFeeRate: serviceFeeRate ?? 0.08,
        domesticShippingJpy: domesticShippingJpy ?? 0,
        surchargeRate: surchargeRate ?? 0,
        depositRate: depositRate ?? 0.30,
        translationProvider: translationProvider ?? 'none',
        translationApiKey: translationApiKey ? encryptIfNeeded(translationApiKey) : null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ?? 465,
        smtpUser: smtpUser || null,
        smtpPass: smtpPass ? encryptIfNeeded(smtpPass) : null,
        smtpFrom: smtpFrom || null,
        smtpSecure: smtpSecure ?? true,
      },
      update: {
        ...(serviceFeeRate !== undefined && { serviceFeeRate }),
        ...(domesticShippingJpy !== undefined && { domesticShippingJpy }),
        ...(surchargeRate !== undefined && { surchargeRate }),
        ...(depositRate !== undefined && { depositRate }),
        ...(translationProvider !== undefined && { translationProvider }),
        ...(!isMasked(translationApiKey) && translationApiKey !== undefined && {
          translationApiKey: translationApiKey ? encryptIfNeeded(translationApiKey) : null,
        }),
        ...(smtpHost !== undefined && { smtpHost: smtpHost || null }),
        ...(smtpPort !== undefined && { smtpPort }),
        ...(smtpUser !== undefined && { smtpUser: smtpUser || null }),
        ...(!isMasked(smtpPass) && smtpPass !== undefined && {
          smtpPass: smtpPass ? encryptIfNeeded(smtpPass) : null,
        }),
        ...(smtpFrom !== undefined && { smtpFrom: smtpFrom || null }),
        ...(smtpSecure !== undefined && { smtpSecure }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[bfj-settings PUT error]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
