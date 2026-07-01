'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { List } from 'lucide-react'
import { sanitizeContentHtml } from '@/lib/sanitize-content'
import { faqToAccordion } from '@/lib/faq-accordion'

type TocItem = {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function stripMarkdownFence(html: string): string {
  // Strip ```html ... ``` or ``` ... ``` wrappers that AI sometimes outputs
  let s = html
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  // Strip leading plain-text lines before the first HTML tag
  const firstTag = s.indexOf('<')
  if (firstTag > 0) {
    const leading = s.slice(0, firstTag).trim()
    if (leading && !leading.includes('>')) s = s.slice(firstTag).trim()
  }

  // Remove <h1> tags — product title is already shown in the page header
  s = s.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '').trim()

  return s
}

function processDescription(html: string): { processed: string; toc: TocItem[] } {
  html = stripMarkdownFence(html)
  // FAQ cũ (<h3>/<p>) → accordion; nội dung mới đã là <details> nên bỏ qua
  html = faqToAccordion(html)
  // Thêm trụ sở HPhòng vào sau showroom HN trong cta-box (fix toàn bộ SP hiện có)
  html = html.replace(
    /Showroom\s+(?:Hà\s+Nội\s*:\s*)?21\s+Lê\s+Văn\s+Lương[^<.]*/gi,
    'Showroom Hà Nội: 21 Lê Văn Lương, Thanh Xuân · Trụ sở Hải Phòng: 115 Đinh Tiên Hoàng, Hồng Bàng'
  )
  const toc: TocItem[] = []
  const usedIds = new Map<string, number>()

  const processed = html.replace(
    /<(h[234])([^>]*)>([\s\S]*?)<\/h[234]>/gi,
    (_, tag: string, attrs: string, inner: string) => {
      const level = parseInt(tag[1] ?? '2')
      const text = inner.replace(/<[^>]*>/g, '').trim()
      if (!text) return _

      let baseId = slugify(text) || `heading-${toc.length + 1}`
      const count = usedIds.get(baseId) ?? 0
      const id = count === 0 ? baseId : `${baseId}-${count}`
      usedIds.set(baseId, count + 1)

      toc.push({ id, text, level })

      // remove existing id attr then inject new one
      const cleanAttrs = attrs.replace(/\s*id="[^"]*"/gi, '')
      return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`
    }
  )

  // Bảo mật: sanitize trước khi render (chặn stored-XSS từ mô tả AI/cào web)
  return { processed: sanitizeContentHtml(processed), toc }
}

const COLLAPSE_HEIGHT = 600

export function ProductDescription({ description, collapseHeight = COLLAPSE_HEIGHT }: { description: string; collapseHeight?: number }) {
  const [tocOpen, setTocOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { processed, toc } = useMemo(() => processDescription(description), [description])

  // Auto-collapse khi expanded mà user scroll lên khỏi vùng mô tả (về khu vực đấu giá)
  useEffect(() => {
    if (collapsed) return
    function onScroll() {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      // Scroll xuống quá → bottom ra khỏi viewport
      // Scroll lên → top quá nửa màn hình (đang xem khu đấu giá bên trên)
      if (rect.bottom < 0 || rect.top > window.innerHeight * 0.5) setCollapsed(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [collapsed])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 80
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div ref={wrapperRef} className="p-6 lg:p-8">
      {/* FAQ accordion trong mô tả (<details class="faq-item">) — bấm câu hỏi mới sổ đáp án */}
      <style>{`
        .faq-item{border:1px solid #e5e7eb;border-left:4px solid #3b82f6;border-radius:10px;margin:10px 0;background:#fff;overflow:hidden}
        .faq-item>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;font-weight:600;color:#111827}
        .faq-item>summary::-webkit-details-marker{display:none}
        .faq-item>summary::after{content:'+';font-size:22px;font-weight:700;line-height:1;color:#3b82f6;flex:0 0 auto}
        .faq-item[open]>summary::after{content:'\\2212'}
        .faq-item>summary:hover{background:#f9fafb}
        .faq-item[open]>summary{border-bottom:1px solid #f1f5f9}
        .faq-item .faq-answer{padding:12px 16px 16px;color:#374151;font-size:15px;line-height:1.65}
      `}</style>
      {/* ── TOC Box ── */}
      {toc.length > 0 && (
        <div className="mb-6 w-full max-w-lg rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setTocOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
              <List className="h-3.5 w-3.5" />
              Nội dung
            </span>
            {/* Toggle icon — giống mẫu: box với mũi tên lên/xuống */}
            <span className="ml-6 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-red-200 bg-red-50 shadow-sm">
              <span className="flex flex-col items-center gap-[1px] leading-none text-red-500" style={{ fontSize: 8 }}>
                <span>▲</span>
                <span>▼</span>
              </span>
            </span>
          </button>

          {/* Items */}
          {tocOpen && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-0.5">
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="flex w-full items-start gap-1.5 rounded px-1 py-1 text-left text-sm text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                  style={{ paddingLeft: `${(item.level - 2) * 16 + 4}px` }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div
        className="relative overflow-hidden transition-[max-height] duration-500"
        style={{ maxHeight: collapsed ? `${collapseHeight}px` : undefined }}
      >
        <div
          className="prose prose-sm max-w-none text-gray-700 leading-7
            [&_p]:mb-4 [&_p]:leading-7
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_strong]:font-semibold [&_strong]:text-gray-900
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:border-l-4 [&_h2]:border-brand-red [&_h2]:pl-4 [&_h2]:leading-snug
            [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-7 [&_h3]:mb-2.5 [&_h3]:border-l-4 [&_h3]:border-blue-400 [&_h3]:pl-3
            [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:mt-4 [&_h4]:mb-1.5
            [&_blockquote]:not-italic [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-amber-900 [&_blockquote]:my-5 [&_blockquote]:text-sm
            [&_table]:w-full [&_table]:border-collapse [&_table]:mb-8 [&_table]:text-sm [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:border [&_table]:border-gray-200
            [&_thead]:bg-gray-800 [&_thead_th]:text-white [&_thead_th]:font-semibold [&_thead_th]:text-left [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-[13px]
            [&_tbody_tr:nth-child(even)]:bg-gray-50 [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr]:border-b [&_tbody_tr]:border-gray-100 [&_tbody_tr:last-child]:border-0
            [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-gray-700 [&_td:first-child]:font-medium [&_td:first-child]:text-gray-900 [&_td:first-child]:w-2/5
            [&_th]:px-4 [&_th]:py-2.5 [&_th]:bg-gray-50 [&_th]:font-semibold [&_th]:text-gray-700 [&_th]:text-left [&_th]:border-b [&_th]:border-gray-200
            [&_.callout]:rounded-xl [&_.callout]:border [&_.callout]:border-blue-100 [&_.callout]:bg-blue-50 [&_.callout]:px-5 [&_.callout]:py-4 [&_.callout]:my-5 [&_.callout]:text-sm [&_.callout]:text-blue-900
            [&_.compare-grid]:grid [&_.compare-grid]:grid-cols-3 [&_.compare-grid]:gap-3 [&_.compare-grid]:my-5 [&_.compare-grid]:text-center [&_.compare-grid]:text-sm
            [&_.compare-box]:rounded-xl [&_.compare-box]:border [&_.compare-box]:px-3 [&_.compare-box]:py-4
            [&_.compare-val]:block [&_.compare-val]:text-2xl [&_.compare-val]:font-extrabold [&_.compare-val]:mb-1
            [&_img]:block [&_img]:mx-auto [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-6 [&_img]:shadow-sm
            [&_a]:text-brand-red [&_a]:underline
            scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
        {collapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {/* Toggle button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:border-brand-red hover:text-brand-red transition"
        >
          {collapsed ? <>Xem thêm <span className="text-xs">▼</span></> : <>Thu gọn <span className="text-xs">▲</span></>}
        </button>
      </div>
    </div>
  )
}
