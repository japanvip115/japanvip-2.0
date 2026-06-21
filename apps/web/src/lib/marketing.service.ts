import { randomBytes } from 'crypto'
import { prisma } from '@japanvip/db'
import { sendWelcomeEmail, sendPostPurchaseEmail } from '@/lib/email.service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://store.japanvip.vn'

/** Lấy (hoặc tạo) token hủy đăng ký cho 1 user. */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { unsubscribeToken: true } })
  if (user?.unsubscribeToken) return user.unsubscribeToken
  const token = randomBytes(24).toString('hex')
  await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } })
  return token
}

export function buildUnsubscribeUrl(token: string): string {
  return `${APP_URL}/api/v1/email/unsubscribe?token=${token}`
}

/**
 * Gửi email chào mừng sau khi xác thực email.
 * Tôn trọng opt-out + chống gửi trùng (EmailLog). Fire-and-forget, không chặn flow.
 */
export async function triggerWelcomeEmail(email: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, marketingOptIn: true, profile: { select: { fullName: true } } },
    })
    if (!user || !user.marketingOptIn) return

    // Chống gửi trùng welcome
    const already = await prisma.emailLog.findFirst({ where: { email: user.email, type: 'welcome' }, select: { id: true } })
    if (already) return

    const token = await ensureUnsubscribeToken(user.id)
    await sendWelcomeEmail({
      email: user.email,
      fullName: user.profile?.fullName || 'bạn',
      unsubscribeUrl: buildUnsubscribeUrl(token),
    })

    await prisma.emailLog.create({ data: { email: user.email, type: 'welcome', userId: user.id } })
  } catch (err) {
    console.error('triggerWelcomeEmail failed:', err)
  }
}

/**
 * Gửi email sau mua (cảm ơn + hướng dẫn + cross-sell) khi QuickOrder COMPLETED.
 * Dedup theo orderRef (gửi tối đa 1 lần/đơn). Tôn trọng opt-out nếu có tài khoản.
 */
export async function triggerPostPurchaseEmail(quickOrderId: string): Promise<void> {
  try {
    const order = await prisma.quickOrder.findUnique({
      where: { id: quickOrderId },
      select: { orderRef: true, email: true, name: true, status: true, productId: true, productName: true, productSlug: true },
    })
    if (!order || order.status !== 'COMPLETED') return

    // Tôn trọng opt-out nếu email gắn với 1 tài khoản đã hủy nhận tin
    const acc = await prisma.user.findUnique({ where: { email: order.email }, select: { id: true, marketingOptIn: true } })
    if (acc && !acc.marketingOptIn) return

    // Chống gửi trùng theo orderRef
    const already = await prisma.emailLog.findFirst({
      where: { type: 'post_purchase', meta: { path: ['orderRef'], equals: order.orderRef } },
      select: { id: true },
    })
    if (already) return

    // Cross-sell: cùng danh mục với SP đã mua (loại trừ chính nó)
    let crossSell: Array<{ name: string; slug: string; image: string | null; price: number | null }> = []
    const bought = await prisma.product.findUnique({ where: { id: order.productId }, select: { categoryId: true } })
    if (bought?.categoryId) {
      const rows = await prisma.product.findMany({
        where: { status: 'ACTIVE', categoryId: bought.categoryId, id: { not: order.productId }, OR: [{ badge: null }, { badge: { not: 'ORDER_ONLY' } }] },
        orderBy: { createdAt: 'desc' }, take: 4,
        select: { name: true, slug: true, salePrice: true, originPrice: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      })
      crossSell = rows.map((p) => ({ name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, price: p.salePrice ? Number(p.salePrice) : p.originPrice ? Number(p.originPrice) : null }))
    }

    const unsubscribeUrl = acc ? buildUnsubscribeUrl(await ensureUnsubscribeToken(acc.id)) : undefined
    await sendPostPurchaseEmail({
      email: order.email,
      fullName: order.name || 'bạn',
      productName: order.productName,
      productSlug: order.productSlug,
      crossSell,
      unsubscribeUrl,
    })

    await prisma.emailLog.create({ data: { email: order.email, type: 'post_purchase', userId: acc?.id ?? null, meta: { orderRef: order.orderRef } } })
  } catch (err) {
    console.error('triggerPostPurchaseEmail failed:', err)
  }
}
