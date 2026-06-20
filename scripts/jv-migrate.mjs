/**
 * Migrate products + images + categories from live japanvip.vn (HuraStore)
 * into the new database, downloading images and re-uploading to R2.
 *
 * Usage:
 *   node scripts/jv-migrate.mjs --wipe      # delete demo data first, then import
 *   node scripts/jv-migrate.mjs --dry       # no DB writes, no uploads (test fetch+map)
 *   node scripts/jv-migrate.mjs             # import without wiping
 *
 * Products are imported as DRAFT.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── env ──────────────────────────────────────────────────────────────────
const envContent = readFileSync(resolve(ROOT, 'apps/web/.env.local'), 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)
process.env.DATABASE_URL = env.DATABASE_URL
process.env.DIRECT_URL = env.DIRECT_URL || env.DATABASE_URL

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})
const R2_BUCKET = env.R2_BUCKET_NAME
const R2_PUBLIC = env.R2_PUBLIC_URL

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const args = process.argv.slice(2)
const WIPE = args.includes('--wipe')
const DRY = args.includes('--dry')

const prisma = new PrismaClient()
const data = JSON.parse(readFileSync(resolve(ROOT, 'scripts/jv-migrate-data.json'), 'utf-8'))

const EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' }

async function downloadAndUpload(srcUrl) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(srcUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.byteLength < 100) throw new Error('empty/tiny file')
      let ext = (srcUrl.split('.').pop() || 'jpg').toLowerCase().split('?')[0]
      if (!EXT_MIME[ext]) ext = 'jpg'
      const contentType = res.headers.get('content-type')?.split(';')[0] || EXT_MIME[ext]
      const key = `products/${randomUUID()}.${ext}`
      if (!DRY) {
        await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: contentType }))
      }
      return `${R2_PUBLIC}/${key}`
    } catch (e) {
      if (attempt === 3) { console.warn(`    ⚠ image failed (${srcUrl}): ${e.message}`); return null }
      await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }
}

async function wipe() {
  console.log('🗑  Wiping demo data...')
  await prisma.bidConfirmOtp.deleteMany({})
  await prisma.auctionSettlement.deleteMany({})
  await prisma.bid.deleteMany({})
  await prisma.auctionMaxBid.deleteMany({})
  await prisma.auctionWatchlist.deleteMany({})
  const a = await prisma.auction.deleteMany({})
  await prisma.productAttribute.deleteMany({})
  await prisma.productImage.deleteMany({})
  const p = await prisma.product.deleteMany({})
  const c = await prisma.category.deleteMany({})
  const b = await prisma.brand.deleteMany({})
  console.log(`   deleted: ${a.count} auctions, ${p.count} products, ${c.count} categories, ${b.count} brands`)
}

function slugify(s) {
  const vn = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ'
  const en = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  s = s.toLowerCase().split('').map(c => { const i = vn.indexOf(c); return i >= 0 ? en[i] : c }).join('')
  return s.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  console.log(`\n=== JapanVIP migration ${DRY ? '(DRY RUN)' : ''} ===`)
  console.log(`categories: ${data.categories.length}, products: ${data.products.length}`)

  if (WIPE && !DRY) await wipe()

  // ── categories ──
  console.log('\n📁 Creating categories...')
  const catIdBySlug = {}
  for (const c of data.categories) {
    if (DRY) { catIdBySlug[c.slug] = 'dry'; continue }
    const created = await prisma.category.create({
      data: {
        name: c.name, slug: c.slug, sortOrder: c.sortOrder, isActive: true,
        metaTitle: `${c.name} Nhật Bản | Japan VIP`,
      },
    })
    catIdBySlug[c.slug] = created.id
  }
  console.log(`   ${Object.keys(catIdBySlug).length} categories ready`)

  // ── brands ──
  console.log('\n🏷  Creating brands...')
  const brandNames = [...new Set(data.products.map(p => p.brand).filter(Boolean))]
  const brandIdByName = {}
  for (const name of brandNames) {
    if (DRY) { brandIdByName[name] = 'dry'; continue }
    const created = await prisma.brand.create({ data: { name, slug: slugify(name), isActive: true } })
    brandIdByName[name] = created.id
  }
  console.log(`   ${brandNames.length} brands: ${brandNames.join(', ')}`)

  // ── products ──
  console.log('\n📦 Importing products + images...')
  let pi = 0, imgOk = 0, imgFail = 0
  for (const p of data.products) {
    pi++
    const prefix = `[${pi}/${data.products.length}]`
    let product = null
    if (!DRY) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          ownerType: 'JAPANVIP',
          status: 'DRAFT',
          condition: 'NEW',
          salePrice: p.salePrice ?? null,
          marketPrice: p.marketPrice ?? null,
          originUrl: p.originUrl,
          categoryId: p.categorySlug ? catIdBySlug[p.categorySlug] : null,
          brandId: p.brand ? brandIdByName[p.brand] : null,
          metaTitle: `${p.name} | Japan VIP`,
        },
      })
    }
    // images
    let sort = 0
    for (const imgUrl of p.images) {
      const r2url = await downloadAndUpload(imgUrl)
      if (!r2url) { imgFail++; continue }
      imgOk++
      if (!DRY) {
        await prisma.productImage.create({
          data: { productId: product.id, url: r2url, isPrimary: sort === 0, sortOrder: sort, altText: p.name },
        })
      }
      sort++
    }
    console.log(`${prefix} ${p.name}  (${sort} imgs, cat=${p.categorySlug || '—'})`)
  }

  console.log(`\n✅ Done. products: ${pi}, images ok: ${imgOk}, failed: ${imgFail}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error('FATAL:', e); await prisma.$disconnect(); process.exit(1) })
