import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@japanvip/db'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN'
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ips = await prisma.blockedIp.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ ips })
}

const addSchema = z.object({
  ip: z.string().ip(),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = addSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'IP không hợp lệ' }, { status: 400 })

  try {
    const created = await prisma.blockedIp.create({
      data: { ip: body.data.ip, reason: body.data.reason },
    })
    return NextResponse.json({ success: true, ip: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'IP đã tồn tại trong danh sách chặn' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ip } = await req.json()
  if (!ip) return NextResponse.json({ error: 'Thiếu IP' }, { status: 400 })

  await prisma.blockedIp.delete({ where: { ip } }).catch(() => {})
  return NextResponse.json({ success: true })
}
