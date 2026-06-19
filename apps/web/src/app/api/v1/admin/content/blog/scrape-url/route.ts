import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

async function getBlocklist(): Promise<RegExp[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'blog_scrape_blocklist' } })
  if (!row) return []
  const patterns: string[] = JSON.parse(row.value)
  return patterns.map((p) => { try { return new RegExp(p, 'gi') } catch { return null } }).filter(Boolean) as RegExp[]
}

// Built-in patterns: Vietnamese blog metadata lines always removed
const BUILTIN_REMOVE = [
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
]

function applyBlocklist(text: string, blocklist: RegExp[]): string {
  let result = text
  for (const re of BUILTIN_REMOVE) {
    re.lastIndex = 0
    result = result.replace(re, (_, g1) => g1 ?? '')
  }
  for (const re of blocklist) {
    re.lastIndex = 0
    result = result.replace(re, '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

function extract(html: string, regex: RegExp) {
  return html.match(regex)?.[1]?.trim() ?? ''
}

function stripNoise(html: string): string {
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

// Find inner content of a block tag by tracking open/close depth
function extractTagContent(html: string, tagName: string, startIndex: number): string {
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

// Find first tag matching keyword in class/id, return its full inner content
const CONTENT_KW = /post-content|entry-content|article-content|article-body|content-detail|singular-content|td-post-content|mvp-content|the-content|detail-content|post-body|article__body|article__content/i
const NOISE_KW = /sidebar|comment|related|share|social|widget|ad[s_-]|banner|popup|cookie|breadcrumb|author-bio|post-nav|pagination|recommend|bai-lien-quan|tin-lien-quan|xem-them|also-read/i

function findContentBlock(html: string): string {
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

function removeNoiseDivs(html: string): string {
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

  // Remove in reverse order so indices stay valid
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const r = toRemove[i]
    if (r) result = result.slice(0, r.start) + result.slice(r.end)
  }
  return result
}

function htmlToMarkdown(html: string): string {
  return html
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `# ${stripTags(t)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `## ${stripTags(t)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `### ${stripTags(t)}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `#### ${stripTags(t)}\n\n`)
    // Inline formatting
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    // Links — keep text only (strip external links to avoid noise)
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)\n\n')
    // Lists — convert <li> first, then remove ul/ol wrappers
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripTags(t).trim()}\n`)
    .replace(/<\/ul>|<\/ol>/gi, '\n')
    .replace(/<ul[^>]*>|<ol[^>]*>/gi, '\n')
    // Paragraphs & line breaks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function extractBody(html: string): string {
  const clean = stripNoise(html)

  // 1. Find content block by class/id keywords (depth-aware)
  const block = findContentBlock(clean)
  if (block) return htmlToMarkdown(removeNoiseDivs(block))

  // 2. <article> — use full depth extraction
  const artMatch = /<article[^>]*>/i.exec(clean)
  if (artMatch) {
    const inner = extractTagContent(clean, 'article', artMatch.index + artMatch[0].length)
    if (inner.length > 200) return htmlToMarkdown(removeNoiseDivs(inner))
  }

  // 3. <main>
  const mainMatch = /<main[^>]*>/i.exec(clean)
  if (mainMatch) {
    const inner = extractTagContent(clean, 'main', mainMatch.index + mainMatch[0].length)
    if (inner.length > 200) return htmlToMarkdown(removeNoiseDivs(inner))
  }

  // 4. body fallback
  const body = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? clean
  return htmlToMarkdown(removeNoiseDivs(body))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JapanVIPBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const rawTitle =
      extract(html, /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
      extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i) ||
      extract(html, /<title[^>]*>([^<]+)<\/title>/i)
    const title = rawTitle.replace(/\s*[\|–\-]\s*[^|\-–]{2,50}$/, '').trim()

    const excerpt =
      extract(html, /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
      extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i) ||
      extract(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
      extract(html, /<meta[^>]*content="([^"]+)"[^>]*name="description"/i)

    const thumbnailUrl =
      extract(html, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
      extract(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i)

    const blocklist = await getBlocklist()
    const content = applyBlocklist(extractBody(html), blocklist)
    const cleanExcerpt = applyBlocklist(excerpt, blocklist)

    return NextResponse.json({ title, excerpt: cleanExcerpt, thumbnailUrl, content })
  } catch (e: any) {
    return NextResponse.json({ error: `Không thể tải trang: ${e.message}` }, { status: 422 })
  }
}
