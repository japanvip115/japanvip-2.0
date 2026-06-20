import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getAiApiKey } from '@/lib/ai-keys'
import { getContentStyle } from '@/lib/ai-style'
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
  const base = `Sản phẩm: ${productName}\n${specs ? `Thông số kỹ thuật:\n${specs}\n` : ''}${keywords ? `Từ khóa SEO: ${keywords}\n` : ''}${extra ? `Thông tin thêm: ${extra}\n` : ''}`
  const instruction = customInstruction?.trim() ? `\n\n📌 Yêu cầu bổ sung:\n${customInstruction.trim()}` : ''

  switch (type) {
    case 'description': {
      const range = maxWords
        ? { min: Math.round(maxWords * 0.85), max: maxWords }
        : detectWordRange(productName, specs)
      const targetWords = range.max

      // Chế độ ngắn gọn khi giới hạn từ thấp
      if (targetWords <= 2000) {
        return `${base}
Chế độ: product_html — RÚT GỌN (tối đa ${targetWords.toLocaleString()} từ)

Viết mô tả sản phẩm HTML gồm các phần rút gọn:
1. Giới thiệu tổng quan (100–150 từ)
2. Công nghệ & tính năng nổi bật — mỗi công nghệ 1 thẻ <h3>, 80–120 từ/mục
3. Ưu điểm nổi bật — bullet ✔
4. Bảng thông số kỹ thuật — <table> HTML (chỉ điền trường có dữ liệu)
5. Cam kết Japan VIP + CTA — Hotline 09.2729.8888

⚠️ Chỉ dùng số liệu từ dữ liệu đầu vào. Thiếu thông số ghi [CẦN JAPAN VIP XÁC NHẬN].
PHẢI hoàn thành trong giới hạn từ, không cắt giữa chừng.${instruction}`
      }

      // Chế độ đầy đủ 14 section
      const mode = targetWords >= 4000 ? 'PREMIUM FLAGSHIP' : 'STANDARD'
      return `${base}
Chế độ: product_html — ${mode} (${range.min.toLocaleString()}–${targetWords.toLocaleString()} từ)

Viết đầy đủ 14 section theo SEO Framework Japan VIP đã được định nghĩa trong system prompt. Tuân thủ đúng:
- Cấu trúc heading: <h2> cho section, <h3> cho công nghệ và câu hỏi bên trong
- Quy tắc dữ liệu: KHÔNG tự tạo số liệu dB, kWh, °C, % nếu không có trong dữ liệu đầu vào
- Bảo hành: dùng "Bảo hành theo chính sách Japan VIP", KHÔNG dùng "bảo hành chính hãng"
- So sánh model (Section 6): nếu thiếu dữ liệu ghi [CHƯA CÓ DỮ LIỆU SO SÁNH]
- Thông số (Section 8): trường thiếu ghi "Đang cập nhật theo model thực tế"
- Phải hoàn thành đủ 14 section, không cắt giữa chừng${instruction}`
    }

    case 'faq':
      return `${base}
Chế độ: faq_json

Tạo 10–15 câu HỎI & ĐÁP thực tế nhất khách hàng hay hỏi về sản phẩm này.
Ưu tiên: điện áp 100V, biến áp, bảo hành tại Japan VIP, vận chuyển, lắp đặt, so sánh model, chi phí điện, vệ sinh bảo trì.
Trả lời chi tiết, thực tế. Chỉ đưa số liệu khi có dữ liệu xác thực.
Xuất JSON array duy nhất: [{"name": "Câu hỏi?", "value": "Trả lời..."}]${instruction}`

    case 'attributes':
      return `${base}
Chế độ: attributes_json

Tạo đầy đủ attributes sản phẩm theo JSON format trong system prompt:
- quick: 6–8 thông số nhanh (chỉ điền trường có dữ liệu xác thực)
- promo: 5–7 tính năng nổi bật
- warranty: thông tin bảo hành (dùng "Bảo hành theo chính sách Japan VIP" nếu không có dữ liệu cụ thể)
- specs: toàn bộ thông số kỹ thuật theo nhóm (trường thiếu ghi "Đang cập nhật")
- faq: 5 câu hỏi thường gặp nhất
Xuất JSON duy nhất, đúng format.${instruction}`

    case 'seo':
      return `${base}
Tạo SEO metadata cho sản phẩm. Xuất JSON:
{"title": "...(60 ký tự, chứa từ khóa chính)","description": "...(150-160 ký tự, hấp dẫn, có CTA)","keywords": ["kw1","kw2","kw3","kw4","kw5"],"slug": "..."}${instruction}`

    case 'blog': {
      const blogWords = maxWords ?? 1500
      return `${base}
Viết bài blog HTML hoàn chỉnh. Cấu trúc: intro hook → các section <h2> → kết luận + CTA Japan VIP (Hotline: 09.2729.8888).
Mục tiêu ${blogWords.toLocaleString()} từ. SEO-friendly, tích hợp từ khóa tự nhiên.
Chỉ đưa số liệu kỹ thuật khi có dữ liệu xác thực. KHÔNG dùng "bảo hành chính hãng".${instruction}`
    }

    case 'social':
      return `${base}
Hãy tạo BỘ NỘI DUNG SOCIAL MEDIA cho sản phẩm này, dạng HTML. Bao gồm:

**1. Facebook Post (dài — trang thương mại)**
- Hook đầu tiên gây chú ý (1–2 câu)
- Giới thiệu sản phẩm + 3–4 tính năng nổi bật dạng emoji bullet (✅ 🔥 💎)
- Thông tin giá, ưu đãi hoặc lợi ích đặc biệt
- CTA rõ ràng: link, hotline 09.2729.8888, địa chỉ showroom
- 5–8 hashtag liên quan (#hàngNhật #japanvip #nộiđịaNhật ...)
- Độ dài: 200–300 từ

**2. Facebook Post (ngắn — quảng cáo/boost)**
- 2–3 dòng hook mạnh
- 1–2 tính năng chính + giá
- CTA + hashtag chính
- Độ dài: 50–80 từ

**3. Zalo Post**
- Tone thân thiện, gần gũi hơn Facebook
- Nhấn mạnh uy tín Japan VIP, hàng chính hãng mới 100%
- Có SĐT Zalo: 0988.969.896
- Độ dài: 100–150 từ

**4. Caption Instagram/TikTok**
- Hook ấn tượng đầu tiên
- 3–5 dòng ngắn, mỗi dòng 1 ý
- Hashtag trend + branded (10–15 hashtag)
- Độ dài: 80–120 từ

Dùng thẻ <h3> cho từng loại post. Giữ giọng văn nhiệt tình, tin cậy, phù hợp thương hiệu hàng Nhật cao cấp.${instruction}`

    case 'email':
      return `${base}
Hãy tạo BỘ EMAIL MARKETING dạng HTML cho sản phẩm này. Bao gồm:

**1. Email Giới thiệu sản phẩm mới (Product Launch)**
- Subject line hấp dẫn (A/B test — 2 phiên bản)
- Preheader text (90 ký tự)
- Header: tên sản phẩm + tagline
- Body: hook → tính năng nổi bật (3–4 bullet) → lợi ích khách hàng → social proof
- CTA button text + mô tả link
- Footer: thông tin Japan VIP, hotline, unsubscribe
- Độ dài body: 200–300 từ

**2. Email Khuyến mãi / Flash Sale**
- Subject urgency (deadline, % giảm)
- Countdown vibe (dù không có đồng hồ thật)
- Giá gốc / giá sale rõ ràng
- 3 lý do mua ngay
- CTA mạnh: "Mua Ngay — Chỉ Còn X Ngày"
- Độ dài: 150–200 từ

**3. Email Chăm sóc sau mua (Follow-up)**
- Cảm ơn khách đã quan tâm/mua sản phẩm
- Hướng dẫn sử dụng cơ bản (3–5 tip)
- Thông tin bảo hành, liên hệ hỗ trợ
- Upsell nhẹ: phụ kiện hoặc sản phẩm liên quan
- Độ dài: 150–200 từ

Dùng thẻ <h2> phân cách 3 email. Viết bằng tiếng Việt, tone chuyên nghiệp nhưng thân thiện.${instruction}`

    case 'video_script':
      return `${base}
Hãy viết KỊCH BẢN VIDEO đầy đủ dạng HTML cho sản phẩm này. Bao gồm:

**1. Kịch bản YouTube Review (7–10 phút)**
Cấu trúc:
- [00:00–00:30] Hook: câu hỏi/vấn đề khách hàng, preview video
- [00:30–01:30] Giới thiệu Japan VIP + sản phẩm (unboxing brief)
- [01:30–03:00] Thiết kế & Đóng gói — mô tả chi tiết
- [03:00–05:30] Tính năng & Công nghệ nổi bật — giải thích từng chức năng
- [05:30–07:00] Trải nghiệm thực tế — demo, tiếng ồn, hiệu suất
- [07:00–08:30] So sánh với hàng Việt Nam / hàng Tàu
- [08:30–09:30] Giá cả, mua ở đâu — Japan VIP, hotline, website
- [09:30–10:00] Kết luận + CTA subscribe, like, comment

Mỗi mục: [timestamp] **Tiêu đề** — lời thoại/hướng dẫn quay phim (2–4 câu)

**2. Script TikTok/Reels (60 giây)**
- [0–3s] Hook cực mạnh: câu hỏi hoặc claim gây tò mò
- [3–15s] Problem: vấn đề khách hàng đang gặp
- [15–45s] Solution: 3 tính năng WOW của sản phẩm (mỗi tính năng 10s)
- [45–55s] Social proof + giá
- [55–60s] CTA: "Link bio", "Comment 'GIÁ' để nhận báo giá"
Ghi rõ: cảnh quay gợi ý, text overlay, nhạc nền

**3. Mô tả Video YouTube (SEO)**
- Title chính (60 ký tự, có từ khóa)
- 3 title A/B test
- Description đầy đủ: intro → timestamp → thông tin Japan VIP → hashtag
- Tags (20 tags)

Dùng thẻ <h2> phân cách 3 phần. Lời thoại tự nhiên, tiếng Việt gần gũi.${instruction}`

    case 'comparison':
      return `${base}
Hãy viết BÀI SO SÁNH SẢN PHẨM hoàn chỉnh dạng HTML. Cấu trúc:

**1. Giới thiệu (100–150 từ)**
- Tại sao cần so sánh? Đối tượng bài viết phù hợp ai?

**2. Bảng so sánh tổng quan**
Tạo bảng HTML 4–5 cột:
- Cột 1: Tiêu chí (Thương hiệu, Xuất xứ, Công nghệ chính, Hiệu suất, Tiết kiệm điện, Độ ồn, Bảo hành, Giá tham khảo)
- Cột 2: Sản phẩm này (Japan VIP) — highlight màu xanh
- Cột 3–5: 3 đối thủ phổ biến cùng phân khúc (hàng Việt Nam hoặc hàng nội địa cùng loại khác hãng)
- Dùng ✅ / ❌ / ⚡ để trực quan hóa

**3. Phân tích chi tiết từng tiêu chí (600–800 từ)**
- Công nghệ & hiệu suất
- Tiết kiệm điện & chi phí vận hành
- Độ bền & chất lượng linh kiện Nhật
- Thiết kế & trải nghiệm người dùng
- Giá trị đồng tiền (value for money)

**4. Đối tượng phù hợp (200 từ)**
- Nên chọn sản phẩm này nếu bạn là...
- Không phù hợp nếu...

**5. Kết luận & Khuyến nghị (150 từ)**
- Tổng kết ưu thế vượt trội
- Lý do chọn Japan VIP
- CTA: Hotline 09.2729.8888, website japanvip.vn

Viết thành thật, khách quan — thừa nhận điểm yếu nếu có để tăng độ tin cậy.${instruction}`

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
    case 'social':
      return `${base}Viết 1 Facebook post test (~80 từ) về sản phẩm này. Dùng emoji, hashtag, CTA Japan VIP.`
    case 'email':
      return `${base}Viết email giới thiệu sản phẩm test (~100 từ). Subject + body ngắn + CTA.`
    case 'video_script':
      return `${base}Viết TikTok script test 30 giây (~100 từ). Hook + 2 tính năng + CTA.`
    case 'comparison':
      return `${base}Viết bảng so sánh test: HTML table 3 cột (sản phẩm này vs 2 đối thủ), 5 tiêu chí.`
    default:
      return `${base}Viết nội dung test ngắn ~200 từ cho: ${type}`
  }
}
