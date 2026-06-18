export type LogoTemplate = {
  id: string
  name: string
  url: string
  width: number
  height: number
}

export type MatchResult =
  | { found: true; templateId: string; templateName: string; left: number; top: number; width: number; height: number }
  | { found: false }

function computeNSSD(buf1: Buffer, buf2: Buffer): number {
  const len = Math.min(buf1.length, buf2.length)
  if (len === 0) return Infinity
  let sum = 0
  for (let i = 0; i < len; i++) {
    const diff = (buf1[i] ?? 0) - (buf2[i] ?? 0)
    sum += diff * diff
  }
  return sum / len
}

// Generous threshold to handle JPEG compression noise (~55 avg diff per channel)
const SSD_THRESHOLD = 3000

// Target sizes (px wide) to try for each template — covers logos from 40px to 250px
const TARGET_WIDTHS = [40, 55, 70, 90, 110, 140, 170, 210, 250]

// Scan this many pixels offset from each corner (logo may not be flush to edge)
const CORNER_SCAN_OFFSETS = [0, 5, 10, 15, 20]

export async function findLogoInImage(
  imageBuffer: Buffer,
  templates: LogoTemplate[],
): Promise<MatchResult> {
  if (templates.length === 0) return { found: false }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharpModule = require('sharp')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharp: (...args: any[]) => any = sharpModule.default ?? sharpModule

  const imgMeta = await sharp(imageBuffer).metadata()
  const imgW = imgMeta.width ?? 800
  const imgH = imgMeta.height ?? 600

  for (const template of templates) {
    const aspectRatio = template.height / template.width

    for (const targetW of TARGET_WIDTHS) {
      const tw = targetW
      const th = Math.round(tw * aspectRatio)

      if (tw < 20 || th < 20) continue
      if (tw > imgW || th > imgH) continue

      // Resize template to this target size
      let templateBuf: Buffer
      try {
        templateBuf = await fetchAndResize(template.url, tw, th, sharp)
      } catch {
        continue
      }

      // 4 corner base positions
      const cornerBases = [
        { baseLeft: 0,        baseTop: 0 },
        { baseLeft: imgW - tw, baseTop: 0 },
        { baseLeft: 0,        baseTop: imgH - th },
        { baseLeft: imgW - tw, baseTop: imgH - th },
      ]

      for (const { baseLeft, baseTop } of cornerBases) {
        for (const ox of CORNER_SCAN_OFFSETS) {
          for (const oy of CORNER_SCAN_OFFSETS) {
            const left = Math.max(0, Math.min(baseLeft + (baseLeft === 0 ? ox : -ox), imgW - tw))
            const top  = Math.max(0, Math.min(baseTop  + (baseTop  === 0 ? oy : -oy), imgH - th))

            let regionBuf: Buffer
            try {
              regionBuf = await sharp(imageBuffer)
                .extract({ left, top, width: tw, height: th })
                .raw()
                .toBuffer()
            } catch {
              continue
            }

            const score = computeNSSD(regionBuf, templateBuf)

            if (score < SSD_THRESHOLD) {
              return {
                found: true,
                templateId: template.id,
                templateName: template.name,
                left,
                top,
                width: tw,
                height: th,
              }
            }
          }
        }
      }
    }
  }

  return { found: false }
}

async function fetchAndResize(
  url: string,
  w: number,
  h: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sharp: (...args: any[]) => any,
): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Cannot fetch template: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return sharp(buf).resize(w, h).raw().toBuffer()
}

// Keep for backwards compat
export async function loadTemplatePixels(template: LogoTemplate): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharpModule = require('sharp')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharp: (...args: any[]) => any = sharpModule.default ?? sharpModule
  return fetchAndResize(template.url, template.width, template.height, sharp)
}
