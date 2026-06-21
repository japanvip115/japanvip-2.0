import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, handleApiError } from '@/lib/api-response'
import { uploadFile } from '@/lib/r2'
import { getActiveExchangeRate } from '@/modules/bfj/services/exchange-rate.service'

export const maxDuration = 60

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function slugifyVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
}

async function downloadAndUploadImage(imageUrl: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': UA, Referer: referer, Accept: 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mime = contentType.split(';')[0]?.trim() ?? 'image/jpeg'
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
    const safeMime = allowed.includes(mime) ? mime : 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength > 10 * 1024 * 1024) return null
    const ext = safeMime.split('/')[1] ?? 'jpg'
    const filename = `japan-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    return await uploadFile('products', buffer, safeMime, filename)
  } catch {
    return null
  }
}

async function findBrandId(productName: string): Promise<string | null> {
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } })
  const lower = productName.toLowerCase()
  for (const b of brands) {
    if (lower.includes(b.name.toLowerCase())) return b.id
  }
  return null
}

async function findCategoryId(productName: string): Promise<string | null> {
  const cats = await prisma.category.findMany({ select: { id: true, name: true } })
  const lower = productName.toLowerCase()
  const rules = [
    { match: ['máy giặt', 'washing', '洗濯'], cat: 'máy giặt' },
    { match: ['tủ lạnh', 'refrigerator', '冷蔵'], cat: 'tủ lạnh' },
    { match: ['điều hòa', 'air conditioner', 'エアコン'], cat: 'điều hòa' },
    { match: ['máy hút bụi', 'vacuum', '掃除機'], cat: 'máy hút bụi' },
    { match: ['nồi cơm', 'rice cooker', '炊飯'], cat: 'nồi cơm' },
    { match: ['quạt', 'fan', '扇風機'], cat: 'quạt' },
    { match: ['lò vi sóng', 'microwave', '電子レンジ'], cat: 'lò vi sóng' },
    { match: ['máy lọc không khí', 'air purifier', '空気清浄'], cat: 'máy lọc không khí' },
    { match: ['máy lọc nước', 'water purifier', '浄水'], cat: 'máy lọc nước' },
    { match: ['bồn cầu', 'toilet', 'ウォシュレット'], cat: 'thiết bị vệ sinh' },
  ]
  for (const rule of rules) {
    if (rule.match.some(kw => lower.includes(kw))) {
      const cat = cats.find(c => c.name.toLowerCase().includes(rule.cat))
      if (cat) return cat.id
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = await req.json()
    const {
      productName,
      originUrl,
      selectedImages = [] as string[],
      description,
      faq,
      attributes,
      seo,
      priceJPY,
      salePriceVnd,
    } = body

    if (!productName) return apiError('Thiếu tên sản phẩm', 400)

    // 🔒 LOCKED (2026-06) — Quy đổi giá + map ảnh R2 + khối phải admin-only. Xem CLAUDE.md. KHÔNG tự sửa.
    // Giá bán VNĐ: hàng Nhật quy đổi ¥→VNĐ theo tỷ giá; đối thủ đã là VNĐ
    let salePrice: number | null = null
    if (typeof salePriceVnd === 'number' && salePriceVnd > 0) {
      salePrice = Math.round(salePriceVnd)
    } else if (typeof priceJPY === 'number' && priceJPY > 0) {
      const { rate } = await getActiveExchangeRate('JPY', 'VND')
      salePrice = Math.round((priceJPY * rate) / 1000) * 1000
    }

    // 1. Tạo slug duy nhất
    const baseSlug = slugifyVi(productName)
    let slug = baseSlug
    let idx = 0
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${++idx}`
    }

    // 2. Lookup brand + category tự động
    const [brandId, categoryId] = await Promise.all([
      findBrandId(productName),
      findCategoryId(productName),
    ])

    // 3. Parse SEO
    let metaTitle: string | null = null
    let metaDesc: string | null = null
    if (seo) {
      try {
        const j = typeof seo === 'string' ? JSON.parse(seo.match(/```json\s*([\s\S]*?)```/)?.[1] ?? seo) : seo
        metaTitle = j.title ?? null
        metaDesc = j.description ?? null
        if (j.slug) slug = j.slug.replace(/[^a-z0-9-]/g, '-').slice(0, 200) || slug
      } catch { /* ignore */ }
    }

    // 4. Upload ảnh song song lên R2 (làm TRƯỚC để có URL R2 thay vào mô tả)
    const uploaded = selectedImages.length > 0
      ? await Promise.all(
          selectedImages.map((url: string, i: number) =>
            downloadAndUploadImage(url, originUrl ?? url).then(saved =>
              saved ? { src: url, url: saved, isPrimary: i === 0, sortOrder: i, altText: productName } : null
            )
          )
        )
      : []
    const savedImages = uploaded.filter((x): x is NonNullable<typeof x> => x !== null)

    // 5. Thay URL ảnh nguồn (Amazon...) trong mô tả bằng URL R2 — tránh hotlink/chết ảnh trên trang live
    let finalDescription: string | null = description || null
    if (finalDescription) {
      for (const img of savedImages) {
        finalDescription = finalDescription.split(img.src).join(img.url)
      }
    }

    // 6. Tạo sản phẩm
    const product = await prisma.product.create({
      data: {
        name: productName,
        slug,
        description: finalDescription,
        status: 'DRAFT',
        condition: 'NEW',
        ownerType: 'JAPANVIP',
        salePrice: salePrice ?? undefined,
        originUrl: originUrl || null,
        metaTitle,
        metaDesc,
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
      },
    })

    // 7. Gắn ảnh gallery vào sản phẩm
    if (savedImages.length > 0) {
      await prisma.productImage.createMany({
        data: savedImages.map(img => ({ url: img.url, isPrimary: img.isPrimary, sortOrder: img.sortOrder, altText: img.altText, productId: product.id })),
      })
    }

    // 6. Lưu attributes — CHỈ lưu thông số kỹ thuật (tab) + FAQ.
    // 🔒 Khối bên PHẢI ([quick], [promo] "Tính năng nổi bật", [warranty]) do ADMIN tự thêm nội dung cứng —
    // AI KHÔNG được tự điền (tránh phá bố cục trang). Rule đã chốt với chủ dự án 2026-06.
    const attrRows: Array<{ productId: string; name: string; value: string }> = []

    if (attributes) {
      try {
        const raw = typeof attributes === 'string'
          ? JSON.parse(attributes.match(/```json\s*([\s\S]*?)```/)?.[1] ?? attributes)
          : attributes

        // specs (grouped) → tab "Thông số kỹ thuật". Bỏ qua quick/promo/warranty (khối phải = admin).
        for (const item of raw.specs ?? []) {
          const group = item.group ? `[group:${item.group}]` : ''
          attrRows.push({ productId: product.id, name: `${group}${item.name}`, value: item.value })
        }
      } catch { /* ignore malformed */ }
    }

    if (faq) {
      try {
        const raw = typeof faq === 'string'
          ? JSON.parse(faq.match(/```json\s*([\s\S]*?)```/)?.[1] ?? faq)
          : faq
        const items = Array.isArray(raw) ? raw : raw.faq ?? []
        for (const item of items) {
          attrRows.push({ productId: product.id, name: `[faq]${item.name}`, value: item.value })
        }
      } catch { /* ignore */ }
    }

    if (attrRows.length > 0) {
      await prisma.productAttribute.createMany({ data: attrRows })
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      attrCount: attrRows.length,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
