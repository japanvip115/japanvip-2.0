import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { getClientIp } from '@/lib/get-client-ip'

const bodySchema = z.object({
  ref: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/i),
  al: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/i).optional(),
  landingUrl: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
})

// Hash IP một chiều (không lưu IP thô — privacy + GDPR-friendly)
function hashIp(ip: string): string {
  const salt = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'japanvip'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 64)
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return new NextResponse(null, { status: 204 })

    const refCode = parsed.data.ref.toUpperCase()
    const partner = await prisma.partnerProfile.findUnique({
      where: { refCode, status: 'APPROVED' },
      select: { id: true },
    })
    if (!partner) return new NextResponse(null, { status: 204 })

    // Resolve link theo mã al (nếu có) — phải thuộc đúng partner này
    let affiliateLinkId: string | null = null
    if (parsed.data.al) {
      const link = await prisma.affiliateLink.findFirst({
        where: { trackingCode: parsed.data.al.toUpperCase(), partnerId: partner.id },
        select: { id: true },
      })
      affiliateLinkId = link?.id ?? null
    }

    const ip = getClientIp(req)
    const ipHash = ip === 'unknown' ? null : hashIp(ip)

    // Dedup: cùng partner + ipHash trong 30 phút → không ghi trùng
    if (ipHash) {
      const recent = await prisma.affiliateClick.findFirst({
        where: {
          partnerId: partner.id,
          ipHash,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
        select: { id: true },
      })
      if (recent) return new NextResponse(null, { status: 204 })
    }

    await prisma.affiliateClick.create({
      data: {
        partnerId: partner.id,
        affiliateLinkId,
        refCode,
        ipHash,
        userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        referrer: parsed.data.referrer?.slice(0, 500) ?? null,
        landingUrl: parsed.data.landingUrl?.slice(0, 500) ?? null,
      },
    })

    // Tăng đếm click cho link (chỉ khi click thật được ghi)
    if (affiliateLinkId) {
      await prisma.affiliateLink.update({
        where: { id: affiliateLinkId },
        data: { clicks: { increment: 1 } },
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    // Tracking không bao giờ được làm vỡ UX
    return new NextResponse(null, { status: 204 })
  }
}
