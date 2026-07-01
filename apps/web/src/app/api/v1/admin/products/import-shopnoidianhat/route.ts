import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile } from '@/lib/r2'
import { fetchSourcePrice, decodeEntities } from '@/lib/pricing/source-price'
import { extractModels, norm, mapLimit } from '@/lib/pricing/match'
import { scrapeCompetitor } from '@/app/api/v1/admin/ai/scrape-competitor/route'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const SITEMAP = 'https://shopnoidianhat.vn/sitemap_products_1.xml'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36' }

function slugifyVi(str: string): string {
  return str
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 200)
}

// name keyword (đã decode, lowercase) → chuỗi khớp tên danh mục web. Xếp cụ thể trước, chung sau.
const CAT_KEYWORDS: Array<{ match: string[]; cat: string }> = [
  { match: ['nồi cơm', 'rice cooker'], cat: 'nồi cơm' },
  { match: ['bếp từ', 'induction'], cat: 'bếp từ' },
  { match: ['lò vi sóng', 'microwave', 'vi sóng'], cat: 'vi sóng' },
  { match: ['máy giặt', 'washing'], cat: 'máy giặt' },
  { match: ['máy sấy bát', 'sấy bát'], cat: 'sấy bát' },
  { match: ['máy rửa bát', 'rửa bát', 'dishwasher'], cat: 'rửa bát' },
  { match: ['hút mùi', 'máy hút mùi'], cat: 'hút mùi' },
  { match: ['máy hút bụi', 'hút bụi', 'vacuum'], cat: 'hút bụi' },
  { match: ['máy hút ẩm', 'hút ẩm'], cat: 'hút ẩm' },
  { match: ['lọc nước', 'water purifier', 'ion kiềm'], cat: 'lọc nước' },
  { match: ['lọc không khí', 'lọc khí', 'air purifier'], cat: 'lọc khí' },
  { match: ['điều hòa', 'máy lạnh', 'điều hoà'], cat: 'điều hòa' },
  { match: ['ghế massage', 'massage'], cat: 'massage' },
  { match: ['đồng hồ', 'clock', 'watch'], cat: 'đồng hồ' },
  { match: ['nắp bệt', 'nắp bồn cầu'], cat: 'nắp bệt' },
  { match: ['bồn cầu', 'bệt vệ sinh', 'toilet'], cat: 'bệt' },
  { match: ['vòi bếp'], cat: 'vòi bếp' },
  { match: ['vòi chậu', 'vòi lavabo', 'vòi rửa'], cat: 'vòi chậu' },
  { match: ['sen tắm', 'vòi sen', 'thiết bị vệ sinh'], cat: 'vệ sinh' },
  { match: ['tủ lạnh', 'refrigerator', 'fridge'], cat: 'tủ lạnh' },
  { match: ['quạt', 'fan'], cat: 'quạt' },
]
async function findCategoryId(name: string, cats: { id: string; name: string }[]): Promise<string | null> {
  const n = name.toLowerCase()
  for (const rule of CAT_KEYWORDS) {
    if (rule.match.some((kw) => n.includes(kw))) {
      // trong các danh mục khớp, ưu tiên tên NGẮN nhất (danh mục cha, tránh dính brand con)
      const matched = cats.filter((x) => x.name.toLowerCase().includes(rule.cat)).sort((a, b) => a.name.length - b.name.length)
      if (matched[0]) return matched[0].id
    }
  }
  return null
}

// Tải ảnh chính → chuẩn hoá 850×850 (contain, nền trắng) → R2
async function uploadPrimaryImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { headers: { ...UA, Referer: 'https://shopnoidianhat.vn/' }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const out = await sharp(input)
      .resize(850, 850, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 90 })
      .toBuffer()
    return await uploadFile('products', out, 'image/jpeg', 'shopnoidianhat.jpg')
  } catch {
    return null
  }
}

// Import SP từ shopnoidianhat: SP chưa có trên web → tạo NHÁP (tên + ảnh chính + giá + mô tả ngắn từ thông số)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole((session.user as any).role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(1, Number(body?.limit) || 8), 15)

    const [xml, existing, cats] = await Promise.all([
      fetch(SITEMAP, { headers: UA, signal: AbortSignal.timeout(20_000) }).then((r) => r.text()),
      prisma.product.findMany({ select: { name: true } }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ])
    const existingModels = [...new Set(existing.flatMap((p) => extractModels(p.name)))]
    const urls = [...xml.matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/gi)].map((m) => m[1]!.trim())

    // SP chưa có (model không trùng SP nào đang có) + có model rõ trong slug
    const candidates: string[] = []
    for (const url of urls) {
      const slugNorm = norm(url.split('/products/')[1] ?? '')
      if (!/[A-Z]/.test(slugNorm) || !/\d/.test(slugNorm)) continue
      if (existingModels.some((m) => slugNorm.includes(m))) continue
      candidates.push(url)
      if (candidates.length >= limit) break
    }

    const created: { name: string; price: number | null; slug: string; hasImage: boolean }[] = []
    await mapLimit(candidates, 3, async (url) => {
      try {
        const [data, priced] = await Promise.all([scrapeCompetitor(url), fetchSourcePrice(url)])
        const name = decodeEntities((priced.name || data.name || '').trim())
        if (!name) return
        const priceRaw = priced.price ?? data.price ?? null
        const price = priceRaw && priceRaw > 0 ? priceRaw : null

        const r2 = data.images[0] ? await uploadPrimaryImage(data.images[0]) : null

        const specHtml = data.specs.length
          ? `<h3>Thông số kỹ thuật</h3><table>${data.specs.slice(0, 20).map((s) => `<tr><td>${s.name}</td><td>${s.value}</td></tr>`).join('')}</table>`
          : ''
        const description = `<p><strong>${name}</strong></p>${specHtml}<p><em>Nội dung chi tiết đang được cập nhật.</em></p>`

        let slug = slugifyVi(name) || 'san-pham'
        let i = 0
        while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${slugifyVi(name)}-${++i}`

        const categoryId = await findCategoryId(name, cats)
        await prisma.product.create({
          data: {
            name, slug, description,
            status: 'DRAFT', condition: 'NEW', ownerType: 'JAPANVIP',
            originUrl: url,
            salePrice: price ?? undefined,
            categoryId: categoryId ?? undefined,
            images: r2 ? { create: [{ url: r2, isPrimary: true, sortOrder: 0, altText: name }] } : undefined,
          },
        })
        created.push({ name, price, slug, hasImage: !!r2 })
      } catch { /* bỏ SP lỗi */ }
    })

    return apiSuccess(
      { candidates: candidates.length, created: created.length, items: created },
      `Đã tạo ${created.length} SP nháp từ shopnoidianhat`,
    )
  } catch (err) {
    return handleApiError(err)
  }
}
