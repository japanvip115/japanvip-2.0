import { prisma } from '@japanvip/db'
import { sendWinbackEmail, sendDigestEmail } from '@/lib/email.service'
import { ensureUnsubscribeToken, buildUnsubscribeUrl } from '@/lib/marketing.service'

// Batch bảo thủ để tránh timeout (SMTP ~1s/email, Hobby giới hạn thời gian).
// Danh sách lớn cần Vercel Pro hoặc queue (Upstash QStash) / ESP bulk.
const WINBACK_BATCH = 25
const DIGEST_BATCH = 25

type Recipient = { id: string; email: string; fullName: string | null }
type MailProduct = { name: string; slug: string; image: string | null; price: number | null }

async function suggestedProducts(limit: number): Promise<MailProduct[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'ACTIVE', OR: [{ badge: null }, { badge: { not: 'ORDER_ONLY' } }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { name: true, slug: true, salePrice: true, originPrice: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
  })
  return rows.map((p) => ({
    name: p.name,
    slug: p.slug,
    image: p.images[0]?.url ?? null,
    price: p.salePrice ? Number(p.salePrice) : p.originPrice ? Number(p.originPrice) : null,
  }))
}

// ─── Win-back: khách không hoạt động 60+ ngày ────────────────────────────────

export async function runWinback(): Promise<{ sent: number }> {
  const candidates = await prisma.$queryRaw<Recipient[]>`
    SELECT u.id, u.email, p.full_name AS "fullName"
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.marketing_opt_in = true
      AND u.email_verified = true
      AND u.role = 'CUSTOMER'
      AND u.status = 'ACTIVE'
      AND u.deleted_at IS NULL
      AND u.created_at < NOW() - INTERVAL '60 days'
      AND COALESCE(GREATEST(
            (SELECT MAX(created_at) FROM quick_orders WHERE email = u.email),
            (SELECT MAX(created_at) FROM bfj_orders  WHERE customer_id = u.id),
            (SELECT MAX(created_at) FROM bids        WHERE bidder_id = u.id)
          ), u.created_at) < NOW() - INTERVAL '60 days'
      AND NOT EXISTS (
            SELECT 1 FROM email_logs el
            WHERE el.email = u.email AND el.type = 'winback' AND el.sent_at > NOW() - INTERVAL '45 days'
          )
    ORDER BY u.created_at ASC
    LIMIT ${WINBACK_BATCH}
  `
  if (candidates.length === 0) return { sent: 0 }

  const products = await suggestedProducts(4)
  let sent = 0
  for (const u of candidates) {
    try {
      const token = await ensureUnsubscribeToken(u.id)
      await sendWinbackEmail({ email: u.email, fullName: u.fullName || 'bạn', unsubscribeUrl: buildUnsubscribeUrl(token), products })
      await prisma.emailLog.create({ data: { email: u.email, type: 'winback', userId: u.id } })
      sent++
    } catch (err) {
      console.error('winback send failed for', u.email, err)
    }
  }
  return { sent }
}

// ─── Digest "Hàng mới về": hằng tuần (thứ 5) ─────────────────────────────────

export async function runNewArrivalsDigest(force = false): Promise<{ sent: number; skipped?: string }> {
  // Giờ VN = UTC+7. Chỉ gửi vào thứ 5 (getUTCDay: 0=CN..4=T5)
  const vnDay = new Date(Date.now() + 7 * 3600 * 1000).getUTCDay()
  if (!force && vnDay !== 4) return { sent: 0, skipped: 'not_thursday' }

  const candidates = await prisma.$queryRaw<Recipient[]>`
    SELECT u.id, u.email, p.full_name AS "fullName"
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.marketing_opt_in = true
      AND u.email_verified = true
      AND u.role = 'CUSTOMER'
      AND u.status = 'ACTIVE'
      AND u.deleted_at IS NULL
      AND NOT EXISTS (
            SELECT 1 FROM email_logs el
            WHERE el.email = u.email AND el.type = 'digest' AND el.sent_at > NOW() - INTERVAL '6 days'
          )
    ORDER BY u.created_at ASC
    LIMIT ${DIGEST_BATCH}
  `
  if (candidates.length === 0) return { sent: 0 }

  const products = await suggestedProducts(4)
  const liveAuctions = await prisma.auction.findMany({
    where: { status: 'LIVE' },
    orderBy: { endsAt: 'asc' },
    take: 3,
    select: { id: true, currentPrice: true, endsAt: true, product: { select: { name: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
  })
  const auctions = liveAuctions.map((a) => ({
    title: a.product.name,
    auctionId: a.id,
    image: a.product.images[0]?.url ?? null,
    currentPrice: Number(a.currentPrice),
    endsAt: a.endsAt.toISOString(),
  }))

  let sent = 0
  for (const u of candidates) {
    try {
      const token = await ensureUnsubscribeToken(u.id)
      await sendDigestEmail({ email: u.email, fullName: u.fullName || 'bạn', unsubscribeUrl: buildUnsubscribeUrl(token), products, auctions })
      await prisma.emailLog.create({ data: { email: u.email, type: 'digest', userId: u.id } })
      sent++
    } catch (err) {
      console.error('digest send failed for', u.email, err)
    }
  }
  return { sent }
}

// Gọi mỗi ngày trong cron 8:00. Win-back chạy mỗi ngày (batch nhỏ), digest chỉ thứ 5.
export async function runDailyMarketing(opts?: { force?: boolean }) {
  const [winback, digest] = await Promise.all([
    runWinback().catch((e) => { console.error('runWinback error', e); return { sent: 0 } }),
    runNewArrivalsDigest(opts?.force).catch((e) => { console.error('runDigest error', e); return { sent: 0 } }),
  ])
  return { winback: winback.sent, digest: digest.sent }
}
