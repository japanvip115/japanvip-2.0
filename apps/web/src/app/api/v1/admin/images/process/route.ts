import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile } from '@/lib/r2'
import { prisma } from '@japanvip/db'
import { z } from 'zod'
import { findLogoInImage } from '@/lib/template-matching'
import type { LogoTemplate } from '@/lib/template-matching'

const rectSchema = z.object({ x: z.number(), y: z.number(), w: z.number().min(5), h: z.number().min(5) })

const schema = z.object({
  imageId: z.string(),
  action: z.enum(['watermark', 'remove-logo', 'auto-remove']),
  // Legacy fields kept for compatibility
  region: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  regionSize: z.number().int().min(20).max(500).optional(),
  // New free-form rect (negative x/y = anchor from right/bottom; -2 = center)
  rect: rectSchema.optional(),
})

const WATERMARK_TEXT = 'JAPANVIP.VN'

function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(14, Math.min(28, Math.floor(width / 18)))
  const padding = 14
  const textWidth = WATERMARK_TEXT.length * fontSize * 0.6
  const textHeight = fontSize
  const x = width - textWidth - padding
  const y = height - padding

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x - 8}" y="${y - textHeight}" width="${textWidth + 16}" height="${textHeight + 8}" rx="4" fill="rgba(0,0,0,0.45)"/>
    <text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255,255,255,0.90)" letter-spacing="1">${WATERMARK_TEXT}</text>
  </svg>`
  return Buffer.from(svg)
}

function getRegionRect(
  region: string,
  imgWidth: number,
  imgHeight: number,
  size: number,
): { left: number; top: number; width: number; height: number } {
  const s = Math.min(size, imgWidth, imgHeight)
  switch (region) {
    case 'top-left':     return { left: 0, top: 0, width: s, height: s }
    case 'top-right':    return { left: imgWidth - s, top: 0, width: s, height: s }
    case 'bottom-right': return { left: imgWidth - s, top: imgHeight - s, width: s, height: s }
    default:             return { left: 0, top: imgHeight - s, width: s, height: s }
  }
}

async function fillRegionWithBg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sharp: (...args: any[]) => any,
  srcBuffer: Buffer,
  rect: { left: number; top: number; width: number; height: number },
  imgW: number,
  imgH: number,
): Promise<Buffer> {
  const { left, top, width, height } = rect

  // Find the best adjacent region to clone — pick the most uniform (lowest variance = clean background)
  const candidates = [
    { left, top: top + height },                         // below
    { left, top: Math.max(0, top - height) },            // above
    { left: left + width, top },                         // right
    { left: Math.max(0, left - width), top },            // left
  ].filter(c => c.left >= 0 && c.top >= 0 && c.left + width <= imgW && c.top + height <= imgH)

  // Get average color of the 4px border around the selection (the actual surrounding context)
  async function getBorderAvgColor(): Promise<{ r: number; g: number; b: number }> {
    const pad = 4
    const bx = Math.max(0, left - pad), by = Math.max(0, top - pad)
    const bw = Math.min(imgW - bx, width + pad * 2), bh = Math.min(imgH - by, height + pad * 2)
    try {
      const buf: Buffer = await sharp(srcBuffer).extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer()
      const ch = Math.floor(buf.length / (bw * bh))
      const il = left - bx, it = top - by, ir = il + width, ib = it + height
      let sr = 0, sg = 0, sb = 0, n = 0
      for (let row = 0; row < bh; row++) {
        for (let col = 0; col < bw; col++) {
          if (col >= il && col < ir && row >= it && row < ib) continue
          const idx = (row * bw + col) * ch
          sr += buf[idx] ?? 0; sg += buf[idx + 1] ?? 0; sb += buf[idx + 2] ?? 0; n++
        }
      }
      return n > 0 ? { r: sr / n, g: sg / n, b: sb / n } : { r: 128, g: 128, b: 128 }
    } catch { return { r: 128, g: 128, b: 128 } }
  }

  // Score = color distance from border (lower = better match) + small variance penalty
  async function scoreCandidate(region: { left: number; top: number }, border: { r: number; g: number; b: number }): Promise<number> {
    try {
      const buf: Buffer = await sharp(srcBuffer)
        .extract({ left: region.left, top: region.top, width, height })
        .raw().toBuffer()
      const ch = Math.floor(buf.length / (width * height))
      let sr = 0, sg = 0, sb = 0, sumSq = 0, n = 0
      for (let i = 0; i < buf.length; i += ch) {
        const rv = buf[i] ?? 0, gv = buf[i + 1] ?? 0, bv = buf[i + 2] ?? 0
        const lum = rv * 0.299 + gv * 0.587 + bv * 0.114
        sr += rv; sg += gv; sb += bv; sumSq += lum * lum; n++
      }
      const mr = sr / n, mg = sg / n, mb = sb / n
      const colorDist = Math.sqrt((mr - border.r) ** 2 + (mg - border.g) ** 2 + (mb - border.b) ** 2)
      return colorDist // primary: match surrounding color
    } catch { return Infinity }
  }

  let cloneSrc: { left: number; top: number } | null = null
  if (candidates.length > 0) {
    const border = await getBorderAvgColor()
    const scores = await Promise.all(candidates.map(c => scoreCandidate(c, border)))
    const bestIdx = scores.indexOf(Math.min(...scores))
    cloneSrc = candidates[bestIdx] ?? null
  }

  let patch: Buffer

  if (cloneSrc) {
    // Clone background pixels from adjacent area — handles gradients & textures perfectly
    const clonedRaw: Buffer = await sharp(srcBuffer)
      .extract({ left: cloneSrc.left, top: cloneSrc.top, width, height })
      .raw()
      .toBuffer()

    const meta = await sharp(srcBuffer)
      .extract({ left: cloneSrc.left, top: cloneSrc.top, width, height })
      .metadata()
    const channels = (meta.channels ?? 3) as 3 | 4

    // Add alpha channel with feathered edges for smooth blending
    const feather = Math.min(12, Math.floor(Math.min(width, height) / 3))
    const rgba = Buffer.alloc(width * height * 4)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcIdx = (row * width + col) * channels
        const dstIdx = (row * width + col) * 4
        rgba[dstIdx]     = clonedRaw[srcIdx]     ?? 255
        rgba[dstIdx + 1] = clonedRaw[srcIdx + 1] ?? 255
        rgba[dstIdx + 2] = clonedRaw[srcIdx + 2] ?? 255
        const dist = Math.min(col, row, width - 1 - col, height - 1 - row)
        rgba[dstIdx + 3] = dist >= feather ? 255 : Math.round((dist / feather) * 255)
      }
    }

    patch = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer()
  } else {
    // Fallback: solid average color with feathered edges
    const sampleSize = 14
    const sx = Math.max(0, left - sampleSize)
    const sy = Math.max(0, top - sampleSize)
    const sw = Math.min(imgW - sx, width + sampleSize * 2)
    const sh = Math.min(imgH - sy, height + sampleSize * 2)
    let r = 230, g = 230, b = 230
    try {
      const borderBuf: Buffer = await sharp(srcBuffer).extract({ left: sx, top: sy, width: sw, height: sh }).raw().toBuffer()
      const il = left - sx, it = top - sy, ir = il + width, ib = it + height
      let sumR = 0, sumG = 0, sumB = 0, count = 0
      const ch = Math.floor(borderBuf.length / (sw * sh))
      for (let row = 0; row < sh; row++) {
        for (let col = 0; col < sw; col++) {
          if (col >= il && col < ir && row >= it && row < ib) continue
          const idx = (row * sw + col) * ch
          sumR += borderBuf[idx] ?? 230; sumG += borderBuf[idx + 1] ?? 230; sumB += borderBuf[idx + 2] ?? 230; count++
        }
      }
      if (count > 0) { r = Math.round(sumR / count); g = Math.round(sumG / count); b = Math.round(sumB / count) }
    } catch { /* ignore */ }

    const feather = Math.min(10, Math.floor(Math.min(width, height) / 4))
    const rgba = Buffer.alloc(width * height * 4)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = (row * width + col) * 4
        rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b
        const dist = Math.min(col, row, width - 1 - col, height - 1 - row)
        rgba[idx + 3] = dist >= feather ? 255 : Math.round((dist / feather) * 255)
      }
    }
    patch = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer()
  }

  return sharp(srcBuffer)
    .composite([{ input: patch, left, top, blend: 'over' }])
    .toBuffer()
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const body = schema.parse(await req.json())
    const { imageId, action, region = 'top-left', regionSize = 200, rect: freeRect } = body

    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image) return apiError('Image not found', 404)

    const fetchRes = await fetch(image.url)
    if (!fetchRes.ok) return apiError('Cannot fetch image', 400)
    const srcBuffer = Buffer.from(await fetchRes.arrayBuffer())

    const contentType =
      fetchRes.headers.get('content-type')?.split(';')[0] ??
      (image.url.endsWith('.png') ? 'image/png' : 'image/jpeg')

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpModule = require('sharp')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharp: (...args: any[]) => any = sharpModule.default ?? sharpModule

    let processed: Buffer
    let autoResult: { found: boolean; templateName?: string } = { found: false }

    if (action === 'watermark') {
      const meta = await sharp(srcBuffer).metadata()
      const w = meta.width ?? 800
      const h = meta.height ?? 600
      processed = await sharp(srcBuffer)
        .composite([{ input: buildWatermarkSvg(w, h), blend: 'over' }])
        .toBuffer()

    } else if (action === 'remove-logo') {
      const meta = await sharp(srcBuffer).metadata()
      const imgW = meta.width ?? 800
      const imgH = meta.height ?? 600

      let rect: { left: number; top: number; width: number; height: number }

      if (freeRect) {
        // Resolve negative (right/bottom anchor) and -2 (center)
        const rw = Math.min(freeRect.w, imgW)
        const rh = Math.min(freeRect.h, imgH)
        let left: number, top: number
        if (freeRect.x === -2) left = Math.max(0, Math.floor((imgW - rw) / 2))
        else if (freeRect.x < 0) left = Math.max(0, imgW + freeRect.x)
        else left = Math.min(freeRect.x, imgW - rw)
        if (freeRect.y === -2) top = Math.max(0, Math.floor((imgH - rh) / 2))
        else if (freeRect.y < 0) top = Math.max(0, imgH + freeRect.y)
        else top = Math.min(freeRect.y, imgH - rh)
        rect = { left, top, width: rw, height: rh }
      } else {
        rect = getRegionRect(region, imgW, imgH, regionSize)
      }

      processed = await fillRegionWithBg(sharp, srcBuffer, rect, imgW, imgH)

    } else {
      // auto-remove: template matching
      const settingRow = await prisma.siteSetting.findUnique({ where: { key: 'logo_templates' } })
      const templates: LogoTemplate[] = settingRow ? (JSON.parse(settingRow.value) as LogoTemplate[]) : []

      if (templates.length === 0) {
        return apiError('Chưa có logo template. Vui lòng thêm template trước.', 400)
      }

      const match = await findLogoInImage(srcBuffer, templates)

      if (!match.found) {
        return apiSuccess({ url: image.url, detected: false, message: 'Không tìm thấy logo nào khớp' })
      }

      const autoMeta = await sharp(srcBuffer).metadata()
      const autoImgW = autoMeta.width ?? 800
      const autoImgH = autoMeta.height ?? 600

      processed = await fillRegionWithBg(sharp, srcBuffer, {
        left: match.left,
        top: match.top,
        width: match.width,
        height: match.height,
      }, autoImgW, autoImgH)
      autoResult = { found: true, templateName: match.templateName }
    }

    const originalName = image.url.split('/').pop() ?? 'image.jpg'
    const newUrl = await uploadFile('products', processed, contentType, originalName)

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { url: newUrl },
    })

    return apiSuccess({ url: updated.url, detected: autoResult.found, templateName: autoResult.templateName })
  } catch (err) {
    return handleApiError(err)
  }
}
