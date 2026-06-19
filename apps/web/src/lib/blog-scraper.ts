// Shared blog scraper utilities
import { uploadFile } from '@/lib/r2'
import { prisma } from '@japanvip/db'

export function extract(html: string, regex: RegExp) {
  return html.match(regex)?.[1]?.trim() ?? ''
}

export function stripNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
}

export function extractTagContent(html: string, tagName: string, startIndex: number): string {
  const open = new RegExp(`<${tagName}[^>]*>`, 'gi')
  const close = new RegExp(`<\\/${tagName}>`, 'gi')
  open.lastIndex = startIndex
  close.lastIndex = startIndex

  let depth = 1
  let pos = startIndex

  while (depth > 0 && pos < html.length) {
    open.lastIndex = pos
    close.lastIndex = pos
    const nextOpen = open.exec(html)
    const nextClose = close.exec(html)

    if (!nextClose) break

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      pos = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) return html.slice(startIndex, nextClose.index)
      pos = nextClose.index + nextClose[0].length
    }
  }
  return ''
}

const CONTENT_KW = /post-content|entry-content|article-content|article-body|content-detail|singular-content|td-post-content|mvp-content|the-content|detail-content|post-body|article__body|article__content/i
const NOISE_KW = /sidebar|comment|related|share|social|widget|ad[s_-]|banner|popup|cookie|breadcrumb|author-bio|post-nav|pagination|recommend|bai-lien-quan|tin-lien-quan|xem-them|also-read/i

export function findContentBlock(html: string): string {
  const tagRe = /<(div|section|article)[^>]*(?:class|id)="([^"]*)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html)) !== null) {
    const fullTag = m[0]
    const tagName = m[1] ?? 'div'
    const attrVal = m[2] ?? ''
    if (CONTENT_KW.test(attrVal) && !NOISE_KW.test(attrVal)) {
      const innerStart = m.index + fullTag.length
      const inner = extractTagContent(html, tagName, innerStart)
      if (inner.length > 200) return inner
    }
  }
  return ''
}

export function removeNoiseDivs(html: string): string {
  const tagRe = /<(div|section|ul|ol)[^>]*(?:class|id)="([^"]*)"[^>]*>/gi
  let result = html
  let m: RegExpExecArray | null
  const toRemove: Array<{ start: number; end: number }> = []

  while ((m = tagRe.exec(result)) !== null) {
    const tagName = m[1] ?? 'div'
    const attrVal = m[2] ?? ''
    if (NOISE_KW.test(attrVal)) {
      const innerStart = m.index + m[0].length
      const inner = extractTagContent(result, tagName, innerStart)
      if (inner !== '') {
        const closeTag = `</${tagName}>`
        const endIdx = result.indexOf(closeTag, m.index + m[0].length + inner.length)
        if (endIdx !== -1) {
          toRemove.push({ start: m.index, end: endIdx + closeTag.length })
        }
      }
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const r = toRemove[i]
    if (r) result = result.slice(0, r.start) + result.slice(r.end)
  }
  return result
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `# ${stripTags(t)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `## ${stripTags(t)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `### ${stripTags(t)}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `#### ${stripTags(t)}\n\n`)
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripTags(t).trim()}\n`)
    .replace(/<\/ul>|<\/ol>/gi, '\n')
    .replace(/<ul[^>]*>|<ol[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function extractBody(html: string): string {
  const clean = stripNoise(html)

  const block = findContentBlock(clean)
  if (block) return htmlToMarkdown(removeNoiseDivs(block))

  const artMatch = /<article[^>]*>/i.exec(clean)
  if (artMatch) {
    const inner = extractTagContent(clean, 'article', artMatch.index + artMatch[0].length)
    if (inner.length > 200) return htmlToMarkdown(removeNoiseDivs(inner))
  }

  const mainMatch = /<main[^>]*>/i.exec(clean)
  if (mainMatch) {
    const inner = extractTagContent(clean, 'main', mainMatch.index + mainMatch[0].length)
    if (inner.length > 200) return htmlToMarkdown(removeNoiseDivs(inner))
  }

  const body = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? clean
  return htmlToMarkdown(removeNoiseDivs(body))
}

export const BUILTIN_REMOVE = [
  /^Tác [Gg]iả\s*:.+$/gm,
  /^Danh [Mm]ục\s*:.+$/gm,
  /^Chuyên [Mm]ục\s*:.+$/gm,
  /^Thẻ\s*:.+$/gm,
  /^Tags?\s*:.+$/gim,
  /^Chia [Ss]ẻ\s*:?.*/gm,
  /^Lượt [Xx]em\s*:.+$/gm,
  /^Ngày [Đđ]ăng\s*:.+$/gm,
  /^Cập [Nn]hật\s*:.+$/gm,
  /^Toggle(#{1,4} )/gm,
  /^NỘI DUNG\s*$/gm,
  /^\*{1,3}\s*$/gm,
]

export function applyBuiltin(text: string): string {
  let result = text
  for (const re of BUILTIN_REMOVE) {
    re.lastIndex = 0
    result = result.replace(re, (_, g1) => g1 ?? '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function applyBlocklist(text: string, blocklist: RegExp[]): string {
  let result = applyBuiltin(text)
  for (const re of blocklist) {
    re.lastIndex = 0
    result = result.replace(re, '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

function cleanTitle(raw: string): string {
  // Remove " | Site Name", " - Site Name", " – Site Name" suffixes
  return raw.replace(/\s*[\|–\-]\s*[^|\-–]{2,50}$/, '').trim()
}

export function scrapeMetadata(html: string) {
  const rawTitle =
    extract(html, /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
    extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i) ||
    extract(html, /<title[^>]*>([^<]+)<\/title>/i)
  const title = cleanTitle(rawTitle)

  const excerpt =
    extract(html, /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
    extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i) ||
    extract(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
    extract(html, /<meta[^>]*content="([^"]+)"[^>]*name="description"/i)

  const thumbnailUrl =
    extract(html, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
    extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i)

  return { title, excerpt, thumbnailUrl }
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JapanVIPBot/1.0)',
  'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
}

export async function mirrorImageToR2(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
  const mimeToUse = MIME_EXT[contentType] ? contentType : 'image/jpeg'
  const ext = MIME_EXT[mimeToUse] ?? 'jpg'

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Use original filename from URL
  const originalName = imageUrl.split('/').pop()?.split('?')[0] ?? `image.${ext}`
  return await uploadFile('blogs', buffer, mimeToUse, originalName)
}

// Replace all external image URLs in markdown content with R2 URLs
export async function mirrorContentImages(
  markdown: string,
  thumbnailUrl: string,
): Promise<{ content: string; thumbnailUrl: string }> {
  // Collect unique image URLs (markdown images + thumbnail)
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
  const urlSet = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(markdown)) !== null) {
    const url = m[2]
    if (url && url.startsWith('http')) urlSet.add(url)
  }
  if (thumbnailUrl?.startsWith('http')) urlSet.add(thumbnailUrl)

  // Upload each unique URL, build replacement map
  const map = new Map<string, string>()
  await Promise.all(
    Array.from(urlSet).map(async (url) => {
      try {
        const r2url = await mirrorImageToR2(url)
        map.set(url, r2url)
      } catch {
        // keep original URL if upload fails
      }
    }),
  )

  // Replace in content
  const content = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, url) => {
    return `![${alt}](${map.get(url) ?? url})`
  })

  const newThumb = (thumbnailUrl && map.get(thumbnailUrl)) ? map.get(thumbnailUrl)! : thumbnailUrl

  return { content, thumbnailUrl: newThumb }
}

export function extractArticleLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const links = new Set<string>()
  const linkRe = /href="([^"]+)"/gi
  let m: RegExpExecArray | null

  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1]
    if (!href) continue
    try {
      const url = new URL(href, baseUrl)
      // Same hostname only
      if (url.hostname !== base.hostname) continue
      // No search params (not pagination)
      if (url.search) continue
      // Path must be longer than base path (it's an article, not the category itself)
      if (url.pathname === base.pathname || url.pathname === '/') continue
      // Path should be longer than category path
      if (!url.pathname.startsWith(base.pathname) && base.pathname !== '/') continue
      // Exclude common non-article paths
      if (/\/(tag|tags|category|categories|author|page|search|feed)\//i.test(url.pathname)) continue
      // Must have at least 1 slug-like segment; allow single-level paths ending in .html
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length === 0) continue
      if (segments.length === 1 && !url.pathname.endsWith('.html') && segments[0]!.length < 10) continue

      links.add(url.href)
    } catch {
      // ignore invalid URLs
    }
  }

  return Array.from(links)
}

// ── Auto product backlink ─────────────────────────────────────────────────────

// Vietnamese stop words to exclude from keyword matching
const VN_STOP = new Set([
  'hướng', 'dẫn', 'cách', 'sử', 'dụng', 'đánh', 'giá', 'review', 'top',
  'nội', 'địa', 'nhật', 'bản', 'mới', 'nhất', 'tốt', 'nhất', 'cao', 'cấp',
  'thông', 'minh', 'hiện', 'đại', 'gia', 'đình', 'mua', 'nên', 'hay',
  'có', 'và', 'của', 'cho', 'với', 'từ', 'các', 'những', 'một', 'là',
  'trong', 'trên', 'về', 'tại', 'đến', 'được', 'này', 'đó', 'như',
  'khi', 'sau', 'trước', 'hay', 'hoặc', 'nếu', 'vì', 'nên', 'thì',
])

export type MatchedProduct = {
  id: string; name: string; slug: string; salePrice: unknown; marketPrice: unknown;
  images: { url: string }[]
}

export async function findRelatedProducts(title: string): Promise<MatchedProduct[]> {
  // Extract meaningful keywords: brand names, model numbers, product nouns
  const words = title
    .replace(/[^\w\sÀ-ỹ]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !VN_STOP.has(w.toLowerCase()))

  // Model numbers (all-caps or alphanumeric like NW-LB18, RC-10HGX)
  const modelRe = /^[A-Z0-9][-A-Z0-9]{2,}$/
  const models = words.filter((w) => modelRe.test(w))

  // Brand names (capitalized, likely loanwords)
  const brandRe = /^[A-Z][a-zA-Z]{2,}$/
  const brands = words.filter((w) => brandRe.test(w))

  // Priority keywords: models first, then brands, then long Vietnamese words
  const keywords = [...new Set([...models, ...brands, ...words])].slice(0, 5)

  if (keywords.length === 0) return []

  // Search products matching any keyword
  const found = await Promise.all(
    keywords.map((kw) =>
      prisma.product.findMany({
        where: { status: 'ACTIVE', name: { contains: kw, mode: 'insensitive' } },
        take: 3,
        select: {
          id: true, name: true, slug: true, salePrice: true, marketPrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
    ),
  )

  // Deduplicate by id, take top 3
  const seen = new Set<string>()
  const results: MatchedProduct[] = []
  for (const group of found) {
    for (const p of group) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        results.push(p)
        if (results.length >= 3) return results
      }
    }
  }
  return results
}

export function appendProductBacklinks(markdown: string, products: MatchedProduct[]): string {
  if (products.length === 0) return markdown

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://japanvip.vn'

  const lines = [
    '\n\n---\n',
    '## Sản phẩm liên quan tại Japan VIP\n',
    ...products.map((p) => {
      const price = p.salePrice ? Number(p.salePrice).toLocaleString('vi-VN') + '₫' : 'Liên hệ'
      return `- **[${p.name}](${baseUrl}/${p.slug})** — ${price}`
    }),
    '\n*Japan VIP chuyên phân phối hàng gia dụng nội địa Nhật Bản chính hãng, mới 100%.*',
  ]

  return markdown + lines.join('\n')
}
