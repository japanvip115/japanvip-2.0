/**
 * Trích frame đầu của video banner → poster JPG nhẹ → upload R2 (path = url video đổi .mp4→.jpg).
 * Dùng Playwright (Chrome local) chụp frame để né CORS-taint canvas.
 * Run: node scripts/gen-banner-poster.mjs <video-url>
 */
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

const VIDEO_URL = process.argv[2]
if (!VIDEO_URL) { console.error('Cần: node gen-banner-poster.mjs <video-url>'); process.exit(1) }

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), 'apps/web/.env.local'), 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function main() {
  console.log('1. Tải video…')
  const buf = Buffer.from(await (await fetch(VIDEO_URL)).arrayBuffer())
  const mp4Path = resolve(tmpdir(), 'hero-poster-src.mp4')
  writeFileSync(mp4Path, buf)
  const htmlPath = resolve(tmpdir(), 'hero-poster.html')
  writeFileSync(htmlPath, `<!doctype html><body style="margin:0"><video id="v" src="file://${mp4Path}" muted playsinline></video></body>`)

  console.log('2. Playwright chụp frame đầu…')
  const browser = await chromium.launch({ executablePath: CHROME })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('file://' + htmlPath)
  const dims = await page.evaluate(async () => {
    const v = document.getElementById('v')
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; if (v.readyState >= 2) res() })
    await new Promise((res) => { v.onseeked = res; v.currentTime = 0.05 })
    return { w: v.videoWidth, h: v.videoHeight }
  })
  await page.setViewportSize({ width: dims.w, height: dims.h })
  await page.$eval('#v', (v, d) => { v.style.width = d.w + 'px'; v.style.height = d.h + 'px' }, dims)
  const png = await page.locator('#v').screenshot()
  await browser.close()
  console.log(`   frame ${dims.w}x${dims.h}, png ${(png.length / 1024).toFixed(0)}KB`)

  console.log('3. Nén poster (sharp)…')
  const jpg = await sharp(png).resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 72, progressive: true }).toBuffer()
  console.log(`   poster jpg ${(jpg.length / 1024).toFixed(0)}KB`)

  console.log('4. Upload R2…')
  const key = new URL(VIDEO_URL).pathname.replace(/^\//, '').replace(/\.mp4$/i, '.jpg')
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  })
  await s3.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME, Key: key, Body: jpg, ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  console.log(`✅ Poster: ${env.R2_PUBLIC_URL}/${key}`)
}
main().catch((e) => { console.error('LỖI:', e); process.exit(1) })
