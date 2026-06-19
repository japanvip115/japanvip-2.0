/**
 * Download brand logos → upload to R2 → update DB via psql
 * Run: node scripts/upload-brand-logos.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const envPath = resolve(process.cwd(), 'apps/web/.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)

const DB_URL = env.DATABASE_URL
const R2_ACCOUNT = env.CLOUDFLARE_ACCOUNT_ID
const R2_KEY = env.R2_ACCESS_KEY_ID
const R2_SECRET = env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = env.R2_BUCKET_NAME
const R2_PUBLIC = env.R2_PUBLIC_URL

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// SimpleIcons slug (https://simpleicons.org) — SVG có sẵn
const SIMPLE_ICONS = {
  'Panasonic':  'panasonic',
  'Hitachi':    'hitachi',
  'Toshiba':    'toshiba',
  'Sharp':      'sharp',
  'Mitsubishi': 'mitsubishi',
}

// Domain để dùng Google favicon service (128px PNG)
const FAVICON_DOMAINS = {
  'Tiger':       'tiger-corporation.com',
  'Daikin':      'daikin.com',
  'Dyson':       'dyson.com',
  'Zojirushi':   'zojirushi.com',
  'Balmuda':     'balmuda.com',
  'Coway':       'coway.com',
  'Iris Ohyama': 'irisohyama.co.jp',
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
})

async function fetchUrl(url, acceptImg = true) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: acceptImg ? 'image/*,*/*;q=0.8' : '*/*' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (acceptImg && !ct.startsWith('image/') && !ct.includes('svg')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength < 200) return null
    return { buf, mime: ct.split(';')[0].trim() }
  } catch {
    return null
  }
}

async function uploadToR2(buf, mime, slug) {
  const ext = mime.includes('svg') ? 'svg' : 'png'
  const key = `brands/${slug}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: mime.includes('svg') ? 'image/svg+xml' : 'image/png',
    CacheControl: 'public, max-age=31536000',
  }))
  return `${R2_PUBLIC}/${key}`
}

function dbQuery(sql) {
  return execSync(`psql "${DB_URL}" -t -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' }).trim()
}

async function main() {
  const raw = dbQuery('SELECT id, name FROM brands ORDER BY name;')
  const brands = raw.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|').map(s => s.trim())
    return { id: parts[0], name: parts[1] }
  }).filter(b => b.id && b.name)

  console.log(`Found ${brands.length} brands\n`)

  for (const brand of brands) {
    const slug = brand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    process.stdout.write(`${brand.name}: `)

    let result = null

    // 1. SimpleIcons SVG
    if (SIMPLE_ICONS[brand.name]) {
      result = await fetchUrl(`https://cdn.simpleicons.org/${SIMPLE_ICONS[brand.name]}`)
      if (result) process.stdout.write('[simpleicons] ')
    }

    // 2. Google favicon PNG 128px
    if (!result && FAVICON_DOMAINS[brand.name]) {
      result = await fetchUrl(`https://www.google.com/s2/favicons?domain=${FAVICON_DOMAINS[brand.name]}&sz=128`)
      if (result) process.stdout.write('[favicon] ')
    }

    // 3. SimpleIcons fallback cho brand chưa có
    if (!result && FAVICON_DOMAINS[brand.name]) {
      const slugTry = brand.name.toLowerCase().replace(/\s+/g, '')
      result = await fetchUrl(`https://cdn.simpleicons.org/${slugTry}`)
      if (result) process.stdout.write('[si-fallback] ')
    }

    if (!result) {
      console.log('❌ Không tải được logo')
      continue
    }

    try {
      const publicUrl = await uploadToR2(result.buf, result.mime, slug)
      dbQuery(`UPDATE brands SET logo_url = '${publicUrl}' WHERE id = '${brand.id}';`)
      console.log(`✅ ${publicUrl}`)
    } catch (err) {
      console.log(`❌ Lỗi: ${err.message}`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
