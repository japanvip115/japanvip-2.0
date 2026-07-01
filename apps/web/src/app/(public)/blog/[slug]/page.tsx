import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@japanvip/db'
import { sanitizeContentHtml } from '@/lib/sanitize-content'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({ where: { slug }, select: { title: true, metaTitle: true, metaDesc: true, thumbnailUrl: true } })
  if (!post) return {}
  const title = post.metaTitle ?? post.title
  const description = post.metaDesc ?? undefined
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title, description, type: 'article', images: [post.thumbnailUrl || '/og-default.jpg'] },
    twitter: { card: 'summary_large_image', title, description, images: [post.thumbnailUrl || '/og-default.jpg'] },
  }
}

export const revalidate = 300

// Pre-render bài blog đã đăng tại build → SSG cache CDN (bài drive SEO).
export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 500,
    select: { slug: true },
  })
  return posts.map((p) => ({ slug: p.slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  const [post, categories, recentPosts, randomProducts] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { slug, status: 'PUBLISHED' },
      include: {
        category: { select: { name: true, slug: true } },
        author: { select: { email: true, profile: { select: { fullName: true } } } },
      },
    }),
    prisma.blogCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { slug: true, title: true, publishedAt: true },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, name: true, slug: true, salePrice: true, marketPrice: true,
        brand: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
  ])

  if (!post) notFound()

  const sidebarProducts = [...randomProducts].sort(() => Math.random() - 0.5).slice(0, 5)

  // 🔒 LOCKED (2026-06) — Render blog đã chốt: CSS bảng/figure, bỏ h1 trùng, gộp <br>, whitelist block,
  // bỏ ảnh hero. Xem CLAUDE.md. KHÔNG tự sửa.
  // Markdown → HTML with cleanup
  const rawHtml = post.content
    // Bỏ <h1> trong nội dung (trùng tiêu đề bài đã hiển thị ở header)
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '')
    // Gộp nhiều <br> liên tiếp thành 1 và bỏ <br> sát các block (tránh khoảng trống thừa)
    .replace(/(?:\s*<br\s*\/?>\s*){2,}/gi, '<br />')
    .replace(/<br\s*\/?>\s*(?=<(?:table|figure|h[1-6]|ul|ol|blockquote))/gi, '')
    .replace(/(<\/(?:table|figure|h[1-6]|ul|ol|blockquote)>)\s*<br\s*\/?>/gi, '$1')
    // Remove blog metadata lines (applies to old content already in DB)
    .replace(/^Tác [Gg]iả\s*:.+$/gm, '')
    .replace(/^Danh [Mm]ục\s*:.+$/gm, '')
    .replace(/^Chuyên [Mm]ục\s*:.+$/gm, '')
    .replace(/^Thẻ\s*:.+$/gm, '')
    .replace(/^Tags?\s*:.+$/gim, '')
    .replace(/^Chia [Ss]ẻ\s*:?.*/gm, '')
    .replace(/^Lượt [Xx]em\s*:.+$/gm, '')
    .replace(/^Ngày [Đđ]ăng\s*:.+$/gm, '')
    .replace(/^Cập [Nn]hật\s*:.+$/gm, '')
    // Remove toggle prefix from headings (scraped table of contents buttons)
    .replace(/^Toggle(#{1,4} )/gm, '$1')
    // Remove standalone TOC labels and separator asterisks
    .replace(/^NỘI DUNG\s*$/gm, '')
    .replace(/^\*{1,3}\s*$/gm, '')
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Inline
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Images & links
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 max-w-full" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists — group consecutive - lines
    .replace(/(^- .+$(\n^- .+$)*)/gm, (block) => {
      const items = block.split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')
      return `<ul>${items}</ul>`
    })
    // Paragraphs
    .split(/\n\n+/)
    .map(chunk => {
      chunk = chunk.trim()
      if (!chunk) return ''
      if (/^<(h[1-6]|ul|ol|img|blockquote|table|figure|p|div|section|pre|hr)/i.test(chunk)) return chunk
      return `<p>${chunk.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  // Bảo mật: sanitize HTML cuối (chặn stored-XSS từ nội dung AI/cào web). Giữ nguyên render đã chốt.
  const html = sanitizeContentHtml(rawHtml)

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
          {/* Article — KHÔNG hiện ảnh bìa lớn ở đầu bài chi tiết (ảnh đã có trong nội dung).
              Thẻ ảnh trên trang danh sách /blog vẫn dùng thumbnailUrl. */}
          <article className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              {post.category && (
                <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mb-3">
                  {post.category.name}
                </span>
              )}
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-snug">{post.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                {post.author?.profile?.fullName && <span className="font-medium text-gray-500">{post.author.profile.fullName}</span>}
                {post.publishedAt && <span>Đăng {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>}
                {post.updatedAt && post.publishedAt &&
                  new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 86_400_000 && (
                    <span>· Cập nhật {new Date(post.updatedAt).toLocaleDateString('vi-VN')}</span>
                  )}
              </div>
              {post.excerpt && (
                <p className="mt-4 text-base text-gray-600 leading-relaxed border-l-4 border-brand-red pl-4 italic">{post.excerpt}</p>
              )}
              {/* FAQ accordion (thẻ <details class="faq-item">) — bấm câu hỏi mới sổ trả lời */}
              <style dangerouslySetInnerHTML={{ __html: `
                .faq-item{border:1px solid #e5e7eb;border-left:4px solid #3b82f6;border-radius:10px;margin:10px 0;background:#fff;overflow:hidden}
                .faq-item>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;font-weight:600;color:#111827}
                .faq-item>summary::-webkit-details-marker{display:none}
                .faq-item>summary::after{content:'+';font-size:22px;font-weight:700;line-height:1;color:#3b82f6;flex:0 0 auto}
                .faq-item[open]>summary::after{content:'\\2212'}
                .faq-item>summary:hover{background:#f9fafb}
                .faq-item[open]>summary{border-bottom:1px solid #f1f5f9}
                .faq-item .faq-answer{padding:12px 16px 16px;color:#374151;font-size:15px;line-height:1.65}
              ` }} />
              <div
                className="mt-6 max-w-none text-gray-800 leading-relaxed
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-gray-900
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-gray-900
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-gray-900
                  [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-gray-900
                  [&_p]:mb-4 [&_p]:text-[15px]
                  [&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1
                  [&_ol]:my-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1
                  [&_li]:text-[15px]
                  [&_strong]:font-semibold [&_strong]:text-gray-900
                  [&_figure]:my-5 [&_figure]:text-center
                  [&_img]:rounded-xl [&_img]:my-4 [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:w-auto [&_img]:max-h-[460px] [&_img]:object-contain
                  [&_table]:w-full [&_table]:my-5 [&_table]:border-collapse [&_table]:text-[14px] [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-gray-200
                  [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900
                  [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
                  [&_tr:nth-child(even)]:bg-gray-50/50
                  [&_a]:text-brand-red [&_a]:underline-offset-2 [&_a]:hover:underline"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Danh mục bài viết</h3>
                <ul className="space-y-1.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/blog?cat=${c.slug}`}
                        className={`block text-sm py-0.5 transition-colors ${post.category?.slug === c.slug ? 'text-brand-red font-semibold' : 'text-gray-600 hover:text-brand-red'}`}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent posts */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Bài viết mới</h3>
              <ul className="space-y-3">
                {recentPosts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`}
                      className={`text-sm leading-snug line-clamp-2 transition-colors ${p.slug === slug ? 'font-semibold text-brand-red' : 'text-gray-600 hover:text-brand-red'}`}>
                      {p.title}
                    </Link>
                    {p.publishedAt && (
                      <p className="mt-0.5 text-xs text-gray-400">{new Date(p.publishedAt).toLocaleDateString('vi-VN')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Random products */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Hàng Mới Về</h3>
              <div className="space-y-4">
                {sidebarProducts.map((p) => {
                  const img = p.images[0]?.url
                  const price = p.salePrice ? Number(p.salePrice) : null
                  const market = p.marketPrice ? Number(p.marketPrice) : null
                  return (
                    <Link key={p.id} href={`/${p.slug}`} className="group block">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-2">
                        {img ? (
                          <Image src={img} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="300px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                        )}
                      </div>
                      {p.brand && <p className="text-xs text-gray-400 mb-0.5">{p.brand.name}</p>}
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-red transition-colors line-clamp-2 leading-snug">{p.name}</p>
                      {price ? (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-brand-red">{price.toLocaleString('vi-VN')}₫</span>
                          {market && market > price && (
                            <span className="text-sm text-gray-400 line-through">{market.toLocaleString('vi-VN')}₫</span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-bold text-brand-red">Liên hệ</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Back to blog */}
            <Link href="/blog" className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-brand-red hover:text-brand-red transition-colors shadow-sm">
              ← Quay lại Blog
            </Link>
          </aside>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.excerpt ?? undefined,
              image: post.thumbnailUrl ?? undefined,
              datePublished: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
              dateModified: post.updatedAt?.toISOString() ?? post.createdAt.toISOString(),
              author: post.author?.profile?.fullName
                ? { '@type': 'Person', name: post.author.profile.fullName }
                : { '@type': 'Organization', name: 'Japan VIP', url: 'https://japanvip.vn' },
              publisher: {
                '@type': 'Organization',
                name: 'Japan VIP',
                logo: { '@type': 'ImageObject', url: 'https://japanvip.vn/logo.png' },
              },
              mainEntityOfPage: { '@type': 'WebPage', '@id': `https://japanvip.vn/blog/${post.slug}` },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://japanvip.vn' },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://japanvip.vn/blog' },
                ...(post.category ? [{ '@type': 'ListItem', position: 3, name: post.category.name, item: `https://japanvip.vn/blog?cat=${post.category.slug}` }] : []),
                { '@type': 'ListItem', position: post.category ? 4 : 3, name: post.title, item: `https://japanvip.vn/blog/${post.slug}` },
              ],
            },
          ]),
        }}
      />
    </div>
  )
}
