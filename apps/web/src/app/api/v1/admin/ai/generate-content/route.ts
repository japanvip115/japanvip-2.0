import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getAiApiKey } from '@/app/api/v1/admin/settings/ai-keys/route'
import { getContentStyle } from '@/app/api/v1/admin/settings/ai-style/route'
import { streamWithClaudeCode, findRelevantKnowledge } from '@/lib/claude-code-stream'
import { prisma } from '@japanvip/db'

// ── Mục tiêu số từ theo danh mục ────────────────────────────────────────────
type WordRange = { min: number; max: number; label: string }

const CATEGORY_WORD_TARGETS: Array<{ keywords: string[]; range: WordRange }> = [
  {
    keywords: ['điều hòa', 'máy lạnh', 'air conditioner', 'air con'],
    range: { min: 3500, max: 4500, label: 'Điều hòa' },
  },
  {
    keywords: ['tủ lạnh', 'refrigerator', 'r-wx', 'r-wgx', 'mr-wz', 'nr-f', 'nr-c', 'gn-'],
    range: { min: 3000, max: 4000, label: 'Tủ lạnh' },
  },
  {
    keywords: ['bồn cầu', 'toilet', 'washlet', 'toto', 'inax', 'lixil'],
    range: { min: 2500, max: 3000, label: 'Bồn cầu' },
  },
  {
    keywords: ['máy lọc không khí', 'lọc không khí', 'air purifier', 'purifier'],
    range: { min: 2000, max: 2500, label: 'Máy lọc không khí' },
  },
  {
    keywords: ['nồi cơm', 'rice cooker', 'nồi hơi', 'jhx-', 'rcx-', 'rcj-', 'sr-'],
    range: { min: 1800, max: 2200, label: 'Nồi cơm điện' },
  },
  {
    keywords: ['máy giặt', 'washing machine', 'bd-', 'na-', 'aw-'],
    range: { min: 2500, max: 3500, label: 'Máy giặt' },
  },
  {
    keywords: ['máy hút bụi', 'vacuum', 'máy hút'],
    range: { min: 1800, max: 2500, label: 'Máy hút bụi' },
  },
  {
    keywords: ['máy sưởi', 'heater', 'quạt sưởi'],
    range: { min: 1800, max: 2500, label: 'Máy sưởi' },
  },
  {
    keywords: ['máy hút ẩm', 'dehumidifier', 'hút ẩm'],
    range: { min: 1800, max: 2300, label: 'Máy hút ẩm' },
  },
]

const DEFAULT_WORD_RANGE: WordRange = { min: 2000, max: 3000, label: 'Gia dụng' }

function detectWordRange(productName: string, specs: string): WordRange {
  const text = `${productName} ${specs}`.toLowerCase()
  for (const cat of CATEGORY_WORD_TARGETS) {
    if (cat.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return cat.range
    }
  }
  return DEFAULT_WORD_RANGE
}

// ── Fetch internal backlinks từ DB ────────────────────────────────────────────
async function buildInternalLinks(productId?: string, categoryId?: string, brandId?: string): Promise<string> {
  if (!categoryId && !brandId) return ''

  const conditions: any[] = [{ status: 'ACTIVE' }]
  if (productId) conditions.push({ id: { not: productId } })

  const orConditions: any[] = []
  if (categoryId) orConditions.push({ categoryId })
  if (brandId) orConditions.push({ brandId })

  const related = await prisma.product.findMany({
    where: { AND: conditions, OR: orConditions },
    select: { name: true, slug: true },
    take: 12,
    orderBy: { updatedAt: 'desc' },
  })

  if (!related.length) return ''

  const lines = related.map(p => `- ${p.name}: /${p.slug}`).join('\n')
  return `\n\n---\n🔗 INTERNAL LINKS — Chèn tự nhiên vào bài viết (KHÔNG liệt kê thành danh sách riêng, PHẢI dùng thẻ <a href="URL">tên sản phẩm</a> nhúng vào câu văn):\n${lines}\n---\n`
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, productName, specs, keywords, extra, customInstruction, freePrompt, provider = 'anthropic', maxWords, testMode, productId, categoryId, brandId } = await req.json()

  const systemPrompt = await getContentStyle()
  const userPrompt = freePrompt?.trim()
    ? freePrompt.trim()
    : testMode
      ? buildTestPrompt(type, productName, specs)
      : buildPrompt(type, productName, specs, keywords, extra, customInstruction, maxWords)

  // ── Claude Code path (dùng subscription, không cần API key) ─────────────
  if (provider === 'claude-code') {
    const kb = productName ? findRelevantKnowledge(productName) : ''
    const links = type === 'description' ? await buildInternalLinks(productId, categoryId, brandId) : ''
    const fullPrompt = `${userPrompt}${kb}${links}`
    const readable = streamWithClaudeCode(fullPrompt, systemPrompt)
    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  }

  // ── Anthropic / OpenAI API path ──────────────────────────────────────────
  const apiKey = await getAiApiKey(provider === 'openai' ? 'openai' : 'anthropic')
  if (!apiKey) {
    return Response.json({ error: 'Chưa cấu hình API Key. Vào Admin → Cài đặt → AI Keys.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  let stream: Awaited<ReturnType<typeof client.messages.stream>>
  try {
    const maxTokens = testMode ? 600 : maxWords ? Math.min(Math.ceil(maxWords * 1.5 * 1.2), 8192) : 8192
    stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi khởi tạo AI'
    return Response.json({ error: msg }, { status: 500 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi stream AI'
        controller.enqueue(encoder.encode(`\n\n❌ ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

function buildPrompt(type: string, productName: string, specs: string, keywords: string, extra: string, customInstruction?: string, maxWords?: number): string {
  const base = `Sản phẩm: ${productName}\n${specs ? `Thông số kỹ thuật:\n${specs}\n` : ''}${keywords ? `Từ khóa SEO: ${keywords}\n` : ''}${extra ? `Thông tin thêm: ${extra}\n` : ''}⚠️ QUAN TRỌNG: Trả về HTML thuần túy, KHÔNG bọc trong \`\`\`html hay bất kỳ markdown code fence nào.\n`
  const instruction = customInstruction?.trim() ? `\n\n📌 Yêu cầu bổ sung:\n${customInstruction.trim()}` : ''

  switch (type) {
    case 'description': {
      const range = maxWords
        ? { min: Math.round(maxWords * 0.85), max: maxWords, label: 'Tùy chỉnh' }
        : detectWordRange(productName, specs)
      const targetWords = range.max

      // Với maxWords thấp → viết ngắn gọn, ưu tiên section quan trọng
      if (targetWords <= 2000) {
        const wordTarget = `\n\n📏 GIỚI HẠN CỨNG: Tối đa ${targetWords.toLocaleString()} từ. PHẢI hoàn thành trong giới hạn này, không được cắt giữa chừng.`
        return `${base}
Hãy viết MÔ TẢ SẢN PHẨM ngắn gọn dưới dạng HTML, đủ các phần sau (rút gọn mỗi phần):

1. Giới thiệu tổng quan (100–150 từ)
2. Công nghệ & tính năng nổi bật (400–600 từ) — mỗi công nghệ 1 thẻ <h2>, 80–120 từ/mục
3. Ưu điểm nổi bật — danh sách ✔
4. Bảng thông số kỹ thuật — table HTML
5. Cam kết Japan VIP + CTA — Hotline 09.2729.8888${wordTarget}${instruction}`
      }

      // Với maxWords cao → viết đầy đủ 13 section
      const wordTarget = `\n\n📏 Độ dài mục tiêu: ${range.min.toLocaleString()}–${targetWords.toLocaleString()} từ. Viết đủ chiều sâu, PHẢI hoàn thành tất cả 13 section.`
      return `${base}
Hãy viết MÔ TẢ SẢN PHẨM hoàn chỉnh dưới dạng HTML theo SEO Framework 3.0, đầy đủ 13 section theo thứ tự:

1. Giới thiệu tổng quan (200–300 từ) — chèn từ khóa chính 2–3 lần
2. Tại sao nên chọn? (300–400 từ) — dùng ✔ liệt kê đối tượng phù hợp
3. Thiết kế sang trọng chuẩn Nhật Bản (300–500 từ)
4. Công nghệ nổi bật (800–1200 từ) — mỗi công nghệ 1 thẻ <h2>, 150–250 từ/mục
5. Trải nghiệm sử dụng thực tế (300–500 từ) — độ ồn, điện năng, bảo quản
6. So sánh với các model khác (300–500 từ) — bảng compare-grid hoặc table
7. Ưu điểm và nhược điểm (200–300 từ) — thành thật để tăng trust
8. Bảng thông số kỹ thuật chi tiết — dạng table HTML
9. Hướng dẫn sử dụng tại Việt Nam (300–500 từ) — điện áp 100V, lắp đặt, bảo trì
10. Câu hỏi thường gặp (10–15 câu) — <h3>Câu hỏi?</h3><p>Trả lời...</p>
11. Chính sách bảo hành tại Japan VIP
12. Cam kết từ Japan VIP — 5 bullet ✔
13. Kêu gọi hành động (CTA) — Hotline 09.2729.8888, japanvip.vn${wordTarget}${instruction}`
    }
    case 'faq':
      return `${base}\nHãy tạo 10–15 câu HỎI & ĐÁP (FAQ) thực tế nhất mà khách hàng hay hỏi về sản phẩm này. Ưu tiên: điện áp 100V, biến áp, bảo hành, vận chuyển, lắp đặt, so sánh model. Trả lời chi tiết, có số liệu cụ thể. Xuất ra dạng JSON array: [{"name": "Câu hỏi?", "value": "Trả lời..."}]${instruction}`
    case 'attributes':
      return `${base}\nHãy tạo đầy đủ ATTRIBUTES cho sản phẩm này theo JSON format đã quy định. Bao gồm: quick (6-8 thông số nhanh), promo (5-7 tính năng nổi bật), warranty (thông tin bảo hành), specs (toàn bộ thông số kỹ thuật theo nhóm).${instruction}`
    case 'seo':
      return `${base}\nHãy tạo:\n1. SEO Title (60 ký tự, chứa từ khóa chính)\n2. Meta Description (150-160 ký tự, hấp dẫn, có CTA)\n3. 5 biến thể từ khóa SEO liên quan\n4. Slug URL tối ưu\n\nXuất ra dạng JSON: {"title": "...", "description": "...", "keywords": [...], "slug": "..."}${instruction}`
    case 'blog': {
      const blogWords = maxWords ?? 1500
      return `${base}\nHãy viết BÀI VIẾT BLOG đầy đủ dạng HTML. Cấu trúc: intro hook → các section h2 → kết luận + CTA Japan VIP. Mục tiêu ${blogWords.toLocaleString()} từ. SEO-friendly, natural keyword integration.${instruction}`
    }
    default:
      return `${base}${instruction}`
  }
}

function buildTestPrompt(type: string, productName: string, specs: string): string {
  const base = `Sản phẩm: ${productName}\n${specs ? `Thông số:\n${specs.split('\n').slice(0, 5).join('\n')}\n` : ''}`
  switch (type) {
    case 'description':
      return `${base}Viết MÔ TẢ THỬ NGHIỆM ngắn (~300 từ) dạng HTML gồm: <h1> tên sản phẩm, 1 đoạn intro, <h2> 2-3 tính năng chính (mỗi mục 1-2 câu), 1 đoạn CTA Japan VIP. Chỉ để test layout, không cần chi tiết.`
    case 'faq':
      return `${base}Tạo 3 câu FAQ test (JSON array): [{"name":"...?","value":"..."}]`
    case 'attributes':
      return `${base}Tạo attributes test tối giản (JSON): {"quick":[{"name":"...","value":"..."}x3],"specs":[{"group":"Chung","name":"...","value":"..."}x3],"promo":[],"warranty":[]}`
    case 'seo':
      return `${base}Tạo SEO test (JSON): {"title":"[tên sản phẩm ngắn]","description":"[1 câu mô tả]","keywords":["kw1","kw2"],"slug":"[slug]"}`
    default:
      return `${base}Viết nội dung test ngắn ~200 từ cho: ${type}`
  }
}
