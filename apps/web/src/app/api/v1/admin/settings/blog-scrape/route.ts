import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { blocklist } = await req.json()
  if (!Array.isArray(blocklist)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  await prisma.siteSetting.upsert({
    where: { key: 'blog_scrape_blocklist' },
    create: { key: 'blog_scrape_blocklist', value: JSON.stringify(blocklist) },
    update: { value: JSON.stringify(blocklist) },
  })
  return NextResponse.json({ ok: true })
}
