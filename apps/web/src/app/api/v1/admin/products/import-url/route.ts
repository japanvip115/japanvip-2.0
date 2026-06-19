import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiError, handleApiError } from '@/lib/api-response'
import { uploadFile } from '@/lib/r2'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function isSafeUrl(raw: string): boolean {
  let parsed: URL
  try { parsed = new URL(raw) } catch { return false }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false
  const h = parsed.hostname.toLowerCase()
  const blocked = [/^localhost$/, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./]
  return !blocked.some((r) => r.test(h))
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(img: any): string {
  if (typeof img === 'string') return img
  if (typeof img === 'object' && img !== null) return img.url ?? img.contentUrl ?? ''
  return ''
}

function resolveUrl(src: string, base: URL): string {
  if (!src) return ''
  if (src.startsWith('http')) return src
  if (src.startsWith('//')) return base.protocol + src
  if (src.startsWith('/')) return `${base.protocol}//${base.host}${src}`
  return ''
}

// Download ảnh từ URL ngoài → upload R2 → trả về public URL
async function downloadAndUpload(imageUrl: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': UA, Referer: referer, Accept: 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    const mime = contentType.split(';')[0]?.trim() ?? ''
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
    const safeMime = allowed.includes(mime) ? mime : 'image/jpeg'

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength > 10 * 1024 * 1024) return null // >10MB skip

    const ext = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg'
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) ? ext : 'jpg'
    const filename = `scraped-${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

    return await uploadFile('products', buffer, safeMime, filename)
  } catch {
    return null
  }
}

// Strip WooCommerce page-builder noise, keep readable content
function cleanHtml(raw: string): string {
  const $c = cheerio.load(`<div id="__root">${raw}</div>`, { xmlMode: false })
  const root = $c('#__root')

  // Hard remove: navigation, TOC, tracking pixels, social share
  root.find([
    '[id*="ez-toc"]', '[class*="ez-toc"]', '.eztoc-hide',
    'script', 'style', 'noscript', 'iframe',
    '[class*="social"]', '[class*="share"]', '[class*="breadcrumb"]',
    '[class*="related"]', '[class*="comment"]', '.widget',
  ].join(',')).remove()

  // Unwrap meaningless layout divs (keep their children)
  root.find([
    '[class*="wpb_"]', '[class*="vc_"]', '[class*="ovr-style"]',
    '[class*="wpb-content"]', '[class*="entry-content"]',
  ].join(',')).each((_, el) => {
    $c(el).replaceWith($c(el).html() ?? '')
  })

  // Strip backlinks — unwrap <a> to text/children only
  root.find('a[href]').each((_, el) => {
    $c(el).replaceWith($c(el).html() ?? $c(el).text())
  })

  // Remove empty block elements
  root.find('div:empty, span:empty, p:empty, section:empty').remove()

  return root.html() ?? raw
}

// Download all <img> in HTML description to R2, replace src
async function uploadDescriptionImages(html: string, referer: string, baseUrl: URL): Promise<string> {
  const $ = cheerio.load(`<div id="__wrap">${html}</div>`, { xmlMode: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imgs: Array<{ el: any; src: string }> = []

  $('#__wrap img').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src') || ''
    const resolved = resolveUrl(src, baseUrl)
    if (resolved.startsWith('http')) imgs.push({ el, src: resolved })
  })

  await Promise.all(
    imgs.map(async ({ el, src }) => {
      const r2url = await downloadAndUpload(src, referer)
      if (r2url) {
        $(el).attr('src', r2url)
        $(el).removeAttr('data-src')
        $(el).removeAttr('srcset')
      }
    }),
  )

  return $('#__wrap').html() ?? html
}

// Scrape thông tin sản phẩm từ WooCommerce / bất kỳ trang nào
async function scrapeProduct(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const $ = cheerio.load(html)
  const baseUrl = new URL(url)

  // JSON-LD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonLd: any = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse($(el).html() ?? '{}')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      for (const item of items) {
        if (item?.['@type'] === 'Product') { jsonLd = item; break }
      }
    } catch { /* ignore */ }
  })

  const og = {
    title: $('meta[property="og:title"]').attr('content') ?? '',
    description: $('meta[property="og:description"]').attr('content') ?? '',
    image: $('meta[property="og:image"]').attr('content') ?? '',
  }

  let name = jsonLd?.name ?? ''
  let brand = typeof jsonLd?.brand === 'string' ? jsonLd.brand : (jsonLd?.brand?.name ?? '')
  let sku = jsonLd?.sku ?? jsonLd?.mpn ?? ''
  let description = typeof jsonLd?.description === 'string' ? jsonLd.description : ''

  // H1 thường là tên sản phẩm hiển thị
  const h1 = $('h1.product_title').first().text().trim() || $('h1').first().text().trim()
  if (h1) name = h1
  if (!name) name = og.title
  if (!description) description = og.description || $('meta[name="description"]').attr('content') || ''
  if (!brand) brand = $('[itemprop="brand"]').text().trim() || $('span.sku').closest('.product_meta').find('.brand').text().trim() || ''
  if (!sku) sku = $('[itemprop="sku"]').text().trim() || $('span.sku').text().trim() || ''

  // Short description HTML
  let shortDescriptionHtml = ''
  for (const sel of ['.woocommerce-product-details__short-description', '.product-short-description', '[class*="short-description"]']) {
    const el = $(sel).first()
    if (el.length) {
      el.find('script,style,noscript').remove()
      const html = cleanHtml(el.html()?.trim() ?? '')
      if (html.length > 20) { shortDescriptionHtml = html; break }
    }
  }

  // Full description HTML
  let descriptionHtml = ''
  for (const sel of ['#tab-description', '.woocommerce-Tabs-panel--description', '.product-description', '.entry-content', '[itemprop="description"]']) {
    const el = $(sel).first()
    if (el.length) {
      el.find('script,style,noscript,iframe').remove()
      const html = cleanHtml(el.html()?.trim() ?? '')
      if (html.length > 100) { descriptionHtml = html; break }
    }
  }

  // Images
  let images: string[] = []
  if (jsonLd?.image) {
    const arr = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
    images = arr.map(extractImageUrl).filter(Boolean)
  }
  if (images.length === 0 && og.image) images = [og.image]

  $('[data-large_image]').each((_, el) => {
    const src = $(el).attr('data-large_image') ?? ''
    if (src && !images.includes(src)) images.push(src)
  })

  if (images.length < 5) {
    for (const sel of ['.woocommerce-product-gallery img', '.product-gallery img', '[class*="gallery"] img', 'figure img']) {
      $(sel).each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('data-large_image') || $(el).attr('src') || ''
        const resolved = resolveUrl(src, baseUrl)
        if (resolved && !images.includes(resolved)) images.push(resolved)
      })
      if (images.length >= 12) break
    }
  }

  images = [...new Set(images)]
    .map((src) => resolveUrl(src, baseUrl))
    .filter(
      (src) =>
        src.startsWith('http') &&
        !src.match(/\/(icon|logo|sprite|avatar|blank|placeholder)\b/i) &&
        !src.match(/\.(svg|gif)$/i) &&
        !src.match(/\d{1,2}x\d{1,2}\./),
    )
    .slice(0, 12)

  const metaTitle = (og.title || name).trim().slice(0, 60)
  const metaDesc = (og.description || description).trim().slice(0, 160)

  return { name: name.trim(), sku: sku.trim(), brand: brand.trim(), description: description.trim(), shortDescriptionHtml, descriptionHtml, images, metaTitle, metaDesc }
}

// Match brand name from scraped text against DB brands
async function findBrandId(scrapedBrand: string, productName: string): Promise<string | null> {
  const allBrands = await prisma.brand.findMany({ select: { id: true, name: true } })
  const text = `${scrapedBrand} ${productName}`.toLowerCase()
  for (const b of allBrands) {
    if (text.includes(b.name.toLowerCase())) return b.id
  }
  return null
}

// Keyword map: product name keywords → category name keywords
const CAT_KEYWORDS: Array<{ match: string[]; cat: string }> = [
  { match: ['nồi cơm', 'noi com', 'rice cooker'], cat: 'nồi cơm' },
  { match: ['quạt', 'quat', 'fan'], cat: 'quạt' },
  { match: ['tủ lạnh', 'tu lanh', 'refrigerator', 'fridge'], cat: 'tủ lạnh' },
  { match: ['máy giặt', 'may giat', 'washing'], cat: 'máy giặt' },
  { match: ['máy lọc nước', 'may loc nuoc', 'water purifier', 'ion kiềm'], cat: 'máy lọc nước' },
  { match: ['máy lọc không khí', 'air purifier', 'loc khong khi'], cat: 'máy lọc không khí' },
  { match: ['vòi', 'bồn cầu', 'toilet', 'shower', 'sen tắm', 'vệ sinh'], cat: 'vệ sinh' },
]

async function findCategoryId(productName: string): Promise<string | null> {
  const allCats = await prisma.category.findMany({ select: { id: true, name: true } })
  const nameLower = productName.toLowerCase()

  for (const rule of CAT_KEYWORDS) {
    if (rule.match.some((kw) => nameLower.includes(kw))) {
      const cat = allCats.find((c) => c.name.toLowerCase().includes(rule.cat))
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
    const { url } = await req.json()
    if (!url || !isSafeUrl(url)) return apiError('URL không hợp lệ', 400)

    // 1. Scrape
    const scraped = await scrapeProduct(url)
    if (!scraped.name && scraped.images.length === 0) {
      return apiError('Không tìm thấy thông tin sản phẩm từ trang này.', 422)
    }

    // 2. Download ảnh → R2 (song song, tối đa 10 ảnh)
    const imageUrls = scraped.images.slice(0, 10)
    const uploadResults = await Promise.all(
      imageUrls.map((imgUrl, i) =>
        downloadAndUpload(imgUrl, url).then((saved) =>
          saved ? { url: saved, isPrimary: i === 0, sortOrder: i, altText: scraped.name || '' } : null,
        ),
      ),
    )
    const savedImages = uploadResults.filter((x): x is NonNullable<typeof x> => x !== null)

    // 3. Tạo slug duy nhất
    const baseSlug = slugifyVi(scraped.name || 'san-pham')
    let slug = baseSlug
    let idx = 0
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${++idx}`
    }

    // 4. Lookup brand + category
    const [brandId, categoryId] = await Promise.all([
      findBrandId(scraped.brand, scraped.name),
      findCategoryId(scraped.name),
    ])

    // 5. Upload ảnh trong nội dung mô tả lên R2, xong ghép mô tả
    const baseUrl = new URL(url)
    const [shortDescR2, descR2] = await Promise.all([
      scraped.shortDescriptionHtml ? uploadDescriptionImages(scraped.shortDescriptionHtml, url, baseUrl) : Promise.resolve(''),
      scraped.descriptionHtml ? uploadDescriptionImages(scraped.descriptionHtml, url, baseUrl) : Promise.resolve(''),
    ])

    const description =
      shortDescR2 && descR2
        ? shortDescR2 + '\n\n' + descR2
        : descR2 || shortDescR2 || scraped.description || null

    // 6. Tạo sản phẩm
    const product = await prisma.product.create({
      data: {
        name: scraped.name || slug,
        slug,
        description,
        status: 'DRAFT',
        condition: 'NEW',
        ownerType: 'JAPANVIP',
        originUrl: url,
        metaTitle: scraped.metaTitle || null,
        metaDesc: scraped.metaDesc || null,
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
        images: savedImages.length > 0 ? { create: savedImages } : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imagesCount: savedImages.length,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
