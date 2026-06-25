import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { extractArticleLinks, scrapeMetadata, extractBody, applyBlocklist, mirrorContentImages, findRelatedProducts, appendProductBacklinks } from '@/lib/blog-scraper'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JapanVIPBot/1.0)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'vi,en;q=0.9',
}

async function getBlocklist(): Promise<RegExp[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'blog_scrape_blocklist' } })
  if (!row) return []
  const patterns: string[] = JSON.parse(row.value)
  return patterns.map((p) => { try { return new RegExp(p, 'gi') } catch { return null } }).filter(Boolean) as RegExp[]
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 2
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

async function scrapeArticle(url: string, blocklist: RegExp[], authorId: string) {
  const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const { title, excerpt, thumbnailUrl } = scrapeMetadata(html)
  if (!title) throw new Error('Không tìm được tiêu đề')

  const rawContent = applyBlocklist(extractBody(html), blocklist)
  const cleanExcerpt = applyBlocklist(excerpt, blocklist)

  // Auto-match related products and append backlinks
  const relatedProducts = await findRelatedProducts(title)
  const contentWithLinks = appendProductBacklinks(rawContent, relatedProducts)

  // Mirror all images to R2
  const mirrored = await mirrorContentImages(contentWithLinks, thumbnailUrl)

  // Derive slug from URL path last segment or title
  const urlPath = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
  const rawSlug = urlPath.replace(/\.html?$/, '') || toSlug(title)
  const slug = await uniqueSlug(rawSlug)

  await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: cleanExcerpt || null,
      thumbnailUrl: mirrored.thumbnailUrl || null,
      content: mirrored.content,
      status: 'DRAFT',
      authorId,
    },
  })

  return title
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as any
  if (!hasRole(user?.role, 'EDITOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 })
  }

  // Find author (current user)
  const author = await prisma.user.findUnique({ where: { email: user.email } })
  if (!author) return NextResponse.json({ error: 'Không tìm được tài khoản' }, { status: 400 })

  // Fetch category page
  const catRes = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) })
  if (!catRes.ok) return NextResponse.json({ error: `Không tải được trang: HTTP ${catRes.status}` }, { status: 422 })
  const catHtml = await catRes.text()

  // Extract article links
  const links = extractArticleLinks(catHtml, url)
  if (links.length === 0) {
    return NextResponse.json({ error: 'Không tìm thấy bài viết nào trên trang này' }, { status: 422 })
  }

  const blocklist = await getBlocklist()

  const results = { imported: 0, skipped: 0, errors: [] as string[] }

  for (const link of links) {
    // Check if already imported (by URL path slug)
    const urlSlug = new URL(link).pathname.split('/').filter(Boolean).pop()?.replace(/\.html?$/, '') ?? ''
    const exists = urlSlug ? await prisma.blogPost.findUnique({ where: { slug: urlSlug } }) : null
    if (exists) { results.skipped++; continue }

    try {
      await scrapeArticle(link, blocklist, author.id)
      results.imported++
    } catch (e: any) {
      results.errors.push(`${link}: ${e.message}`)
    }

    // Small delay to avoid hammering the target server
    await new Promise((r) => setTimeout(r, 500))
  }

  return NextResponse.json({ ...results, total: links.length })
}
