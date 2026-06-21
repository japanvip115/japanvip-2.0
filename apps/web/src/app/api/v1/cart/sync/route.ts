import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'

const itemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  priceVnd: z.number().nullable().optional(),
  quantity: z.number().int().min(1),
})

const schema = z.object({ items: z.array(itemSchema).max(100) })

// Đồng bộ giỏ hàng client → server (chỉ khi đã đăng nhập). Giỏ rỗng → xoá.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ ok: true, synced: false }) // khách vãng lai: bỏ qua

  try {
    const { items } = schema.parse(await req.json())
    const userId = session.user.id

    if (items.length === 0) {
      await prisma.cart.deleteMany({ where: { userId } })
      return Response.json({ ok: true, synced: true, items: 0 })
    }

    await prisma.cart.upsert({
      where: { userId },
      create: { userId, items, reminded: false },
      update: { items, reminded: false },
    })
    return Response.json({ ok: true, synced: true, items: items.length })
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
}
