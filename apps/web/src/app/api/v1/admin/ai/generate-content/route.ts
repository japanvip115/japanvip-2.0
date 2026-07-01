import { resolveEditorAuth } from '@/lib/api-auth'
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

// ── Tự nhận danh mục theo tên sản phẩm (hàng Nhật chưa có trong DB) ────────────
const LINK_CAT_RULES: Array<{ kw: string[]; cat: string }> = [
  { kw: ['nồi cơm', 'rice cooker', '炊飯', 'jhx', 'rcx', 'rcj', 'nx-', 'sr-'], cat: 'nồi cơm' },
  { kw: ['tủ lạnh', 'refrigerator', '冷蔵', 'r-wx', 'mr-wz', 'nr-f'], cat: 'tủ lạnh' },
  { kw: ['máy giặt', 'washing', '洗濯', 'bd-', 'na-', 'aw-'], cat: 'máy giặt' },
  { kw: ['điều hòa', 'air conditioner', 'エアコン'], cat: 'điều hòa' },
  { kw: ['máy hút bụi', 'vacuum', '掃除機'], cat: 'máy hút bụi' },
  { kw: ['lò vi sóng', 'microwave', '電子レンジ', 'er-'], cat: 'lò vi sóng' },
  { kw: ['máy lọc không khí', 'air purifier', '空気清浄', 'mck'], cat: 'lọc không khí' },
  { kw: ['máy lọc nước', 'water purifier', '浄水'], cat: 'lọc nước' },
  { kw: ['bồn cầu', 'toilet', 'washlet', 'ウォシュレット'], cat: 'vệ sinh' },
]

async function detectCategoryByName(productName: string): Promise<{ id: string; slug: string } | null> {
  const lower = productName.toLowerCase()
  const rule = LINK_CAT_RULES.find(r => r.kw.some(k => lower.includes(k.toLowerCase())))
  if (!rule) return null
  const cats = await prisma.category.findMany({ select: { id: true, slug: true, name: true } })
  const cat = cats.find(c => c.name.toLowerCase().includes(rule.cat))
  return cat ? { id: cat.id, slug: cat.slug } : null
}

// ── Fetch internal backlinks từ DB (sản phẩm liên quan + trang danh mục) ───────
async function buildInternalLinks(opts: {
  productId?: string; categoryId?: string; brandId?: string; productName?: string
}): Promise<string> {
  let { categoryId } = opts
  const { productId, brandId, productName } = opts

  let categorySlug = ''
  if (!categoryId && productName) {
    const detected = await detectCategoryByName(productName)
    if (detected) { categoryId = detected.id; categorySlug = detected.slug }
  } else if (categoryId) {
    const c = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } })
    categorySlug = c?.slug ?? ''
  }

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

  if (!related.length && !categorySlug) return ''

  const lines = related.map(p => `- ${p.name}: /${p.slug}`).join('\n')
  const catLine = categorySlug ? `- Xem thêm cùng danh mục: /danh-muc/${categorySlug}\n` : ''
  return `\n\n---\n🔗 INTERNAL LINKS — Chèn TỰ NHIÊN vào câu văn (KHÔNG liệt kê thành danh sách riêng, PHẢI dùng thẻ <a href="URL">tên</a> nhúng vào câu, chèn 3–6 link rải đều bài):\n${catLine}${lines}\n---\n`
}

// 🔒 LOCKED (2026-06) — Trang Nhật đã chốt & khoá. KHÔNG sửa nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md.
// ── Tư liệu tham khảo tiếng Việt (từ trang VN, viết kỹ hơn trang Nhật) ─────────
function buildVnReferenceBlock(vn: { content?: string; specs?: Array<{ name: string; value: string }> } | undefined): string {
  if (!vn) return ''
  const specsText = (vn.specs ?? []).slice(0, 40).map(s => `- ${s.name}: ${s.value}`).join('\n')
  const content = (vn.content ?? '').slice(0, 5000).trim()
  if (!specsText && !content) return ''
  return `\n\n---\n📚 TƯ LIỆU THAM KHẢO TIẾNG VIỆT (từ trang VN — dùng để BỔ SUNG thông tin/thông số còn thiếu và học cách diễn đạt tự nhiên cho người Việt):
${specsText ? `\nThông số tham khảo:\n${specsText}\n` : ''}${content ? `\nNội dung tham khảo:\n${content}\n` : ''}
⚠️ CHỈ dùng thông tin KHỚP với sản phẩm đang viết. KHÔNG copy nguyên văn, KHÔNG bịa. Nếu số liệu mâu thuẫn với dữ liệu gốc Nhật, ƯU TIÊN dữ liệu gốc Nhật.
---\n`
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!await resolveEditorAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, productName, specs, keywords, extra, customInstruction, freePrompt, provider = 'anthropic', maxWords, testMode, productId, categoryId, brandId, claudeCodeModel, images = [], vnReference } = await req.json()

  const systemPrompt = await getContentStyle()
  const userPrompt = freePrompt?.trim()
    ? freePrompt.trim()
    : type === 'product_name'
      ? buildProductNamePrompt(productName, specs, extra)
      : testMode
        ? buildTestPrompt(type, productName, specs)
        : buildPrompt(type, productName, specs, keywords, extra, customInstruction, maxWords, images)

  const vnBlock = type !== 'product_name' && !freePrompt?.trim() ? buildVnReferenceBlock(vnReference) : ''

  // Backlink nội bộ — cho cả mô tả & blog, mọi nhánh provider (tự nhận danh mục cho hàng Nhật)
  const links = (type === 'description' || type === 'blog') && !freePrompt?.trim()
    ? await buildInternalLinks({ productId, categoryId, brandId, productName })
    : ''

  // ── Claude Code path (dùng subscription, không cần API key) ─────────────
  if (provider === 'claude-code') {
    const kb = productName && type !== 'product_name' ? findRelevantKnowledge(productName) : ''
    const fullPrompt = `${userPrompt}${vnBlock}${kb}${links}`
    const readable = streamWithClaudeCode(fullPrompt, systemPrompt, claudeCodeModel)
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
    const maxTokens = type === 'product_name' ? 120 : testMode ? 600 : maxWords ? Math.min(Math.ceil(maxWords * 1.5 * 1.2), 8192) : 8192
    stream = client.messages.stream({
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: `${userPrompt}${vnBlock}${links}` }],
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

const HTML_ONLY = `⛔ OUTPUT RULES (BẮT BUỘC, ƯU TIÊN CAO NHẤT):
- Chỉ trả về nội dung yêu cầu. KHÔNG giải thích, KHÔNG ghi chú, KHÔNG commentary.
- KHÔNG dùng backtick (\`), KHÔNG dùng markdown, KHÔNG bọc trong code block.
- KHÔNG viết "Đã tạo xong...", "File lưu tại...", "Bạn có muốn..." hay bất kỳ câu meta nào.
- Bắt đầu ngay bằng thẻ HTML hoặc JSON — không có gì trước đó.

`

// ══════════════════════════════════════════════════════════════════════════════
// 🔒 LOCKED (2026-06) — Rule AI Writer Trang Nhật đã chốt với chủ dự án.
// KHÔNG sửa/xoá VI_ONLY_RULE, NO_PLACEHOLDER_RULE, buildImageBlock, buildProductNamePrompt
// nếu chưa được chủ dự án yêu cầu rõ. Xem CLAUDE.md (mục LOCKED).
// ══════════════════════════════════════════════════════════════════════════════

// ── Quy tắc CỨNG luôn áp dụng cho mô tả (không bị Style Editor ghi đè) ────────
const VI_ONLY_RULE = `\n\n🈲 BẮT BUỘC — NGÔN NGỮ & ĐƠN VỊ:
- Toàn bộ bài viết PHẢI bằng tiếng Việt. DỊCH hết nhãn + giá trị thông số tiếng Nhật/tiếng Anh sang tiếng Việt (vd: 電圧→Điện áp, ワット数→Công suất, 容量→Dung tích, 圧力IH炊飯器→Nồi cơm điện cao tần áp suất).
- TUYỆT ĐỐI KHÔNG để sót ký tự tiếng Nhật (kanji/kana: 合, 升, 時間, ○, ×...) hay chữ trong ngoặc kiểu "(風乾燥)", "(予約)" trong bài VÀ trong bảng thông số. Chỉ giữ tiếng Nhật khi là tên model/mã sản phẩm.
- DUNG TÍCH nồi cơm: ĐỔI sang LÍT, KHÔNG dùng "合", "cup", "hợp", "chén". Quy đổi: 5.5合 → "1.0 lít", 1升 (10合) → "1.8 lít", 3合 → "0.5 lít" (1合 ≈ 0.18 lít).
- Ký hiệu ○ → "Có", × → "Không".`

// 🔒 Không để placeholder lộ "máy móc" trong thông số hiển thị cho khách. Rule đã chốt với chủ dự án 2026-06.
const NO_PLACEHOLDER_RULE = `\n\n🚫 BẮT BUỘC — THÔNG SỐ SẠCH (khách đọc):
- TUYỆT ĐỐI KHÔNG ghi các câu placeholder như: "Đang cập nhật theo model thực tế", "Cần Japan VIP xác nhận", "[ĐANG CẬP NHẬT]", "[CẦN JAPAN VIP XÁC NHẬN]", "đang cập nhật"...
- Trường thông số nào KHÔNG có dữ liệu xác thực thì BỎ HẲN dòng/mục đó — không liệt kê ra.
- Chỉ hiển thị các thông số có giá trị thật. Bảng thông số phải gọn, sạch, như do người biên tập viết.`

function buildImageBlock(images: string[]): string {
  if (!images?.length) return ''
  const list = images.map((u, i) => `${i + 1}. ${u}`).join('\n')
  return `\n\n🖼️ ẢNH SẢN PHẨM — BẮT BUỘC CHÈN VÀO BÀI (admin đã chọn lọc sẵn, không có logo/tiếng Nhật):
${list}

Quy tắc chèn ảnh:
- Ảnh số 1 = ẢNH CHÍNH: chèn NGAY SAU đoạn giới thiệu tổng quan (Section 1).
- Các ảnh còn lại: chèn rải đều, mỗi ảnh đặt ở cuối một section công nghệ / trải nghiệm có ngữ cảnh phù hợp với ảnh đó.
- Cú pháp DUY NHẤT: <figure><img src="URL" alt="[mô tả tiếng Việt]" loading="lazy" /></figure>
- PHẢI dùng CHÍNH XÁC từng URL ở trên (copy nguyên văn), đúng thứ tự, KHÔNG bịa URL khác, KHÔNG dùng lại 1 URL hai lần, KHÔNG bỏ sót ảnh nào.`
}

function buildProductNamePrompt(productName: string, specs: string, extra: string): string {
  return `Tên gốc (tiếng Nhật/Anh): ${productName}
${extra ? `${extra}\n` : ''}${specs ? `Thông số:\n${specs}\n` : ''}
Nhiệm vụ: Tạo TÊN HIỂN THỊ tiếng Việt cho sản phẩm này để đăng lên website japanvip.vn.

QUY TẮC BẮT BUỘC:
- Định dạng cố định: [Loại sản phẩm cốt lõi tiếng Việt] [Thương hiệu] [Model] [Tính năng phụ] [Thông số đo]
  · Loại cốt lõi = danh từ loại sản phẩm chính (vd "Máy lọc không khí", "Lò vi sóng", "Nồi cơm điện").
  · Tính năng phụ = chức năng/đặc tính bổ sung, đặt NGAY SAU model (vd "tạo ẩm", "hơi nước", "không dầu", "cao tần"). Không có thì bỏ.
  · Thông số đo = dung tích/diện tích/công suất nếu có (vd "41m²", "23L"). GIỮ NGUYÊN đơn vị (m², L...) kể cả dấu ².
- Thương hiệu + Model phải đứng NGAY SAU loại cốt lõi — TUYỆT ĐỐI KHÔNG chèn tính năng phụ vào giữa loại và thương hiệu.
- LOẠI BỎ HOÀN TOÀN: ký tự tiếng Nhật (【Amazon.co.jp限定】, (東芝)...), và các từ tiếng Anh dư thừa (Vertical Opening, Compact, For Single Living/Family, Easy Operation, LCD Panel...).
- Ví dụ: "Máy lọc không khí Daikin MCK556A-T tạo ẩm 41m²", "Lò vi sóng Toshiba ER-60ZB(K) hơi nước 23L"
- Tối đa 90 ký tự. Không dấu nháy, không markdown, không giải thích.
- Trả về DUY NHẤT tên sản phẩm trên một dòng, bọc trong <h1>...</h1>.`
}

function buildPrompt(type: string, productName: string, specs: string, keywords: string, extra: string, customInstruction?: string, maxWords?: number, images: string[] = []): string {
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
        return `${HTML_ONLY}${base}
Chế độ: product_html — RÚT GỌN (tối đa ${targetWords.toLocaleString()} từ)

Viết mô tả sản phẩm HTML gồm các phần rút gọn:
1. Giới thiệu tổng quan (100–150 từ)
2. Công nghệ & tính năng nổi bật — mỗi công nghệ 1 thẻ <h3>, 80–120 từ/mục
3. Ưu điểm nổi bật — bullet ✔
4. Bảng thông số kỹ thuật — <table> HTML (chỉ điền trường có dữ liệu)
5. Cam kết Japan VIP + CTA — Hotline 09.2729.8888

⚠️ Chỉ dùng số liệu từ dữ liệu đầu vào. Thiếu thông số thì BỎ HẲN dòng đó, KHÔNG ghi placeholder.
PHẢI hoàn thành trong giới hạn từ, không cắt giữa chừng.${buildImageBlock(images)}${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`
      }

      // Chế độ đầy đủ 14 section
      const mode = targetWords >= 4000 ? 'PREMIUM FLAGSHIP' : 'STANDARD'
      return `${HTML_ONLY}${base}
Chế độ: product_html — ${mode} (${range.min.toLocaleString()}–${targetWords.toLocaleString()} từ)

Viết đầy đủ 14 section theo SEO Framework Japan VIP đã được định nghĩa trong system prompt. Tuân thủ đúng:
- Cấu trúc heading: <h2> cho section, <h3> cho công nghệ. RIÊNG Section 11 (Câu hỏi thường gặp): mỗi câu hỏi PHẢI là accordion <details class="faq-item"><summary>Câu hỏi?</summary><div class="faq-answer"><p>Trả lời...</p></div></details> — TUYỆT ĐỐI KHÔNG dùng <h3> cho câu hỏi FAQ
- Quy tắc dữ liệu: KHÔNG tự tạo số liệu dB, kWh, °C, % nếu không có trong dữ liệu đầu vào
- Bảo hành: dùng "Bảo hành theo chính sách Japan VIP", KHÔNG dùng "bảo hành chính hãng"
- So sánh model (Section 6): nếu thiếu dữ liệu, BỎ section hoặc chỉ nêu định tính — KHÔNG ghi placeholder lộ máy móc
- Thông số (Section 8): trường thiếu thì BỎ HẲN dòng đó, KHÔNG ghi "Đang cập nhật"
- Phải hoàn thành đủ 14 section, không cắt giữa chừng${buildImageBlock(images)}${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`
    }

    case 'faq':
      return `${HTML_ONLY}${base}
Chế độ: faq_json

Tạo 10–15 câu HỎI & ĐÁP thực tế nhất khách hàng hay hỏi về sản phẩm này.
Ưu tiên: điện áp 100V, biến áp, bảo hành tại Japan VIP, vận chuyển, lắp đặt, so sánh model, chi phí điện, vệ sinh bảo trì.
Trả lời chi tiết, thực tế. Chỉ đưa số liệu khi có dữ liệu xác thực.
Xuất JSON array duy nhất: [{"name": "Câu hỏi?", "value": "Trả lời..."}]${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    case 'attributes':
      return `${HTML_ONLY}${base}
Chế độ: attributes_json

Tạo đầy đủ attributes sản phẩm theo JSON format trong system prompt:
- quick: 6–8 thông số nhanh (chỉ điền trường có dữ liệu xác thực)
- promo: 5–7 tính năng nổi bật
- warranty: thông tin bảo hành (dùng "Bảo hành theo chính sách Japan VIP" nếu không có dữ liệu cụ thể)
- specs: toàn bộ thông số kỹ thuật theo nhóm. THỨ TỰ NHÓM CỐ ĐỊNH (đúng từng chữ): "Thông tin chung" (Thương hiệu/Model/Màu sắc/Xuất xứ) → "Thông số kỹ thuật" → "Phụ kiện kèm theo" → "Kích thước & Trọng lượng" → "Vận hành". Trường thiếu thì BỎ HẲN, không thêm vào JSON.
- faq: 5 câu hỏi thường gặp nhất
Xuất JSON duy nhất, đúng format.${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    case 'seo':
      return `${HTML_ONLY}${base}
Tạo SEO metadata cho sản phẩm. Xuất JSON:
{"title": "...(60 ký tự, chứa từ khóa chính)","description": "...(150-160 ký tự, hấp dẫn, có CTA)","keywords": ["kw1","kw2","kw3","kw4","kw5"],"slug": "..."}${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    // 🔒 LOCKED (2026-06) — Văn phong + cấu trúc blog học từ kho đối thủ, đã chốt. Xem CLAUDE.md. KHÔNG tự sửa.
    case 'blog': {
      const blogWords = maxWords ?? 7500
      const blogMin = Math.round(blogWords * 0.8)
      return `${HTML_ONLY}${base}
Viết bài blog HTML dài, chi tiết như một biên tập viên gia dụng Nhật chuyên nghiệp. Học văn phong từ hiephongjapan.vn: đi thẳng vào số liệu, trung thực, thực tế, không sáo rỗng.

⚠️ ĐỘ DÀI BẮT BUỘC: ${blogMin.toLocaleString()}–${blogWords.toLocaleString()} từ. PHẢI đạt tối thiểu ${blogMin.toLocaleString()} từ. Mỗi section phải viết đầy đủ, chi tiết — KHÔNG tóm tắt ngắn gọn, KHÔNG bỏ section.

🏷️ TIÊU ĐỀ BÀI (thẻ <h1> đầu, BẮT BUỘC):
- Chọn 1 mẫu tiêu đề customer-friendly (không phải mã model):
  · "[Dung tích/Công suất] nội địa Nhật: [Câu hỏi khách hay hỏi]?"
  · "Đánh giá [sản phẩm] nội địa Nhật: Review thực tế tại Việt Nam"
  · "Có nên mua [sản phẩm] nội địa Nhật không? Ưu nhược điểm thật"
  · "So sánh [A] và [B]: Cái nào đáng mua hơn?"
  · "[Sản phẩm]: [Lợi ích cụ thể cho gia đình N người]"
- Ví dụ tốt: "Tủ lạnh Hitachi 540L nội địa Nhật: Dùng tốt cho gia đình 4–5 người, cần biến áp 100V"
- TUYỆT ĐỐI KHÔNG dùng tiêu đề chỉ là mã model (vd "Tủ lạnh Hitachi R-HXCC54V")

✍️ MỞ BÀI: bắt đầu bằng tình huống thực tế của khách hàng hoặc câu hỏi họ đang tìm câu trả lời — KHÔNG định nghĩa "X là dòng... thuộc thương hiệu...".

📑 CẤU TRÚC 12 SECTION (mỗi section dùng <h2>, mỗi mục con dùng <h3> — bỏ section nào thiếu dữ liệu):
I.   Trước khi mua — những điều cần xác định
II.  Tổng quan sản phẩm (dung tích/công suất, phân khúc, đối tượng phù hợp)
III. Bảng thông số kỹ thuật chi tiết (<table> HTML — chỉ điền trường có dữ liệu xác thực)
IV.  Công nghệ & tính năng nổi bật (mỗi công nghệ 1 <h3>, giải thích cơ chế + lợi ích thực tế, 150–200 từ/mục)
V.   Thiết kế & ngoại hình (kích thước, màu, trọng lượng, vật liệu)
VI.  Trải nghiệm sử dụng thực tế tại Việt Nam (tiếng ồn, tiêu thụ điện, vận hành mùa hè/nồm)
VII. Lưu ý điện 100V — biến áp và chi phí (PHẢI có — đây là điểm độc quyền của hàng nội địa Nhật)
VIII.Ưu điểm nổi bật (bullet ✔)
IX.  Nhược điểm cần cân nhắc (THẬT THÀ: bảng tiếng Nhật, giá cao, cần biến áp, giao hàng HN+HP — KHÔNG giấu)
X.   Sản phẩm phù hợp với ai — và KHÔNG phù hợp với ai
XI.  5 câu hỏi nên hỏi người bán trước khi xuống tiền
XII. Kết luận + Câu hỏi thường gặp (FAQ — 5–8 câu, dùng <h3> cho mỗi câu)
     + CTA Japan VIP: Hotline 09.2729.8888, giao hàng Hà Nội và Hải Phòng

Mục tiêu ${blogWords.toLocaleString()} từ (~${Math.round(blogWords * 6.5).toLocaleString()} ký tự). SEO tự nhiên. Heading đặt tên tự nhiên theo ý nghĩa (KHÔNG đánh số La Mã vào thẻ <h2>/<h3>, chỉ là số La Mã trong text nếu cần phân biệt). PHẢI hoàn thành đủ các section, không cắt giữa chừng.
Chỉ đưa số liệu khi có dữ liệu xác thực. KHÔNG dùng "bảo hành chính hãng".${buildImageBlock(images)}${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`
    }

    case 'social':
      return `${HTML_ONLY}${base}
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

Dùng thẻ <h3> cho từng loại post. Giữ giọng văn nhiệt tình, tin cậy, phù hợp thương hiệu hàng Nhật cao cấp.${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    case 'email':
      return `${HTML_ONLY}${base}
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

Dùng thẻ <h2> phân cách 3 email. Viết bằng tiếng Việt, tone chuyên nghiệp nhưng thân thiện.${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    case 'video_script':
      return `${HTML_ONLY}${base}
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

Dùng thẻ <h2> phân cách 3 phần. Lời thoại tự nhiên, tiếng Việt gần gũi.${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

    case 'comparison':
      return `${HTML_ONLY}${base}
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

Viết thành thật, khách quan — thừa nhận điểm yếu nếu có để tăng độ tin cậy.${VI_ONLY_RULE}${NO_PLACEHOLDER_RULE}${instruction}`

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
