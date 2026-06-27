// Content Studio — định nghĩa từng kênh + văn phong + luật nội dung JapanVip.
// Tách riêng để dễ mở rộng kênh mới mà không đụng route/UI.

export type StudioGoal = 'seo' | 'sales' | 'new_arrival' | 'education' | 'remarketing'
export type StudioLength = 'short' | 'medium' | 'long'

export type StudioContext = {
  productName?: string
  brandName?: string
  categoryName?: string
  price?: string // đã format "1.234.000₫" (không bịa nếu rỗng)
  specs?: string // "Nhãn: giá trị; Nhãn: giá trị"
  topic?: string // chủ đề nhập tay khi không gắn sản phẩm
  goal?: StudioGoal
  audience?: string
  tone?: string
  length?: StudioLength
  cta?: string
  keywordPrimary?: string
  keywordsSecondary?: string
  voltageNote?: string // ghi chú điện áp admin nhập tay (vd "Hàng nội địa Nhật 100V")
  knowledge?: string // khối tài liệu tham khảo (findRelevantKnowledge)
}

export type ChannelKey =
  | 'FACEBOOK'
  | 'ZALO'
  | 'TIKTOK_CAPTION'
  | 'TIKTOK_SCRIPT'
  | 'YOUTUBE_SHORTS'
  | 'YOUTUBE_OUTLINE'
  | 'EMAIL'
  | 'PUSH'
  | 'BANNER'
  | 'META_AD'
  | 'CHATBOT'

export type ChannelDef = {
  key: ChannelKey
  label: string
  group: string
  hint: string
}

export const CONTENT_CHANNELS: ChannelDef[] = [
  { key: 'FACEBOOK',        label: 'Facebook Post',        group: 'Mạng xã hội', hint: 'Bài đăng fanpage: hook + lợi ích + CTA + hashtag' },
  { key: 'ZALO',            label: 'Zalo OA',              group: 'Mạng xã hội', hint: 'Ngắn gọn, rõ giá trị / ưu đãi / hàng mới về' },
  { key: 'TIKTOK_CAPTION',  label: 'TikTok Caption',       group: 'Video',       hint: 'Caption ngắn + hashtag bắt trend' },
  { key: 'TIKTOK_SCRIPT',   label: 'TikTok Script',        group: 'Video',       hint: 'Kịch bản quay: hook 3 giây đầu, câu ngắn' },
  { key: 'YOUTUBE_SHORTS',  label: 'YouTube Shorts',       group: 'Video',       hint: 'Kịch bản 30–50 giây, súc tích' },
  { key: 'YOUTUBE_OUTLINE', label: 'YouTube Outline',      group: 'Video',       hint: 'Dàn ý video review/so sánh chuyên sâu' },
  { key: 'EMAIL',           label: 'Email Marketing',      group: 'Trực tiếp',   hint: 'Tiêu đề + preview + nội dung + CTA' },
  { key: 'PUSH',            label: 'Push Notification',    group: 'Trực tiếp',   hint: 'Tiêu đề ngắn + body < 120 ký tự' },
  { key: 'BANNER',          label: 'Banner Headline',      group: 'Quảng cáo',   hint: '2–3 phương án headline + sub-headline' },
  { key: 'META_AD',         label: 'Quảng cáo Meta',       group: 'Quảng cáo',   hint: 'Primary text + headline + description' },
  { key: 'CHATBOT',         label: 'Kịch bản tư vấn',      group: 'Trực tiếp',   hint: 'Kịch bản chatbot tư vấn sản phẩm' },
]

const CHANNEL_MAP: Record<ChannelKey, ChannelDef> = Object.fromEntries(
  CONTENT_CHANNELS.map((c) => [c.key, c]),
) as Record<ChannelKey, ChannelDef>

export function isChannelKey(v: string): v is ChannelKey {
  return v in CHANNEL_MAP
}

export function channelLabel(key: string): string {
  return CHANNEL_MAP[key as ChannelKey]?.label ?? key
}

const BRAND = `Japan VIP — phân phối hàng gia dụng nội địa Nhật Bản chính hãng, mới 100%.
Hotline: 09.2729.8888 · Zalo: 0988.969.896 · Web: japanvip.vn
Showroom: 21 Lê Văn Lương, Thanh Xuân, Hà Nội.`

// Luật nội dung JapanVip — áp cho MỌI kênh (chống phóng đại, bịa số, sai điện áp).
const CONTENT_RULES = `LUẬT NỘI DUNG BẮT BUỘC:
- Viết tiếng Việt tự nhiên, dễ đọc. KHÔNG nhồi từ khoá.
- KHÔNG dùng "tốt nhất", "rẻ nhất", "100% tiết kiệm điện", "diệt sạch vi khuẩn", "bền trọn đời" hay bất kỳ khẳng định tuyệt đối không có căn cứ.
- KHÔNG bịa thông số. KHÔNG đoán năm sản xuất. KHÔNG tự khẳng định còn hàng, giá, hay chính sách bảo hành nếu dữ liệu không được cung cấp.
- Với hàng điện NỘI ĐỊA NHẬT (thường 100V): phải nhắc khách lưu ý điện áp và thường cần biến áp khi dùng tại Việt Nam. Nếu chưa rõ công suất, ghi "(cần xác minh công suất trước khi chọn biến áp)".
- Thông tin chưa chắc chắn → ghi rõ "(cần xác minh)" thay vì suy đoán.
- Ưu tiên trải nghiệm thực tế và lời khuyên mua hàng cho khách Việt Nam; mỗi bài cần có insight riêng, không chép catalog.
- Giọng: chuyên nghiệp, đáng tin, am hiểu hàng Nhật, rõ ràng, không khoa trương, tinh thần tư vấn thật.`

export function buildSystemPrompt(channelKey: ChannelKey): string {
  return `Bạn là chuyên gia content marketing đa kênh cho thương hiệu hàng gia dụng Nhật Bản cao cấp.
${BRAND}

${CONTENT_RULES}

QUY TẮC ĐẦU RA:
- Trả về DUY NHẤT phần nội dung cho kênh "${channelLabel(channelKey)}" (text thuần tiếng Việt).
- KHÔNG dùng dấu \`\`\`, KHÔNG markdown tiêu đề, KHÔNG giải thích, KHÔNG meta-commentary ("Đây là bài...", "Hy vọng...").
- Bắt đầu ngay bằng nội dung.`
}

const GOAL_LABEL: Record<StudioGoal, string> = {
  seo: 'tối ưu SEO / tìm kiếm',
  sales: 'thúc đẩy bán hàng / chốt đơn',
  new_arrival: 'giới thiệu hàng mới về',
  education: 'giáo dục khách hàng / cung cấp kiến thức',
  remarketing: 'remarketing / nhắc khách quay lại',
}

const LENGTH_LABEL: Record<StudioLength, string> = {
  short: 'ngắn gọn',
  medium: 'vừa phải',
  long: 'chi tiết',
}

function contextBlock(ctx: StudioContext): string {
  const lines: string[] = []
  if (ctx.productName) lines.push(`Tên sản phẩm: ${ctx.productName}`)
  if (ctx.brandName) lines.push(`Thương hiệu: ${ctx.brandName}`)
  if (ctx.categoryName) lines.push(`Danh mục: ${ctx.categoryName}`)
  if (ctx.price) lines.push(`Giá: ${ctx.price}`)
  if (ctx.specs) lines.push(`Thông số: ${ctx.specs}`)
  if (ctx.voltageNote) lines.push(`Ghi chú điện áp: ${ctx.voltageNote}`)
  if (ctx.topic) lines.push(`Chủ đề / gợi ý: ${ctx.topic}`)

  const meta: string[] = []
  if (ctx.goal) meta.push(`Mục tiêu: ${GOAL_LABEL[ctx.goal]}`)
  if (ctx.audience) meta.push(`Tệp khách hàng: ${ctx.audience}`)
  if (ctx.tone) meta.push(`Tông giọng mong muốn: ${ctx.tone}`)
  if (ctx.cta) meta.push(`CTA mong muốn: ${ctx.cta}`)
  if (ctx.keywordPrimary) meta.push(`Từ khoá chính: ${ctx.keywordPrimary}`)
  if (ctx.keywordsSecondary) meta.push(`Từ khoá phụ: ${ctx.keywordsSecondary}`)

  let block = ''
  if (lines.length) block += `\n\nDỮ LIỆU NGUỒN:\n${lines.join('\n')}`
  if (meta.length) block += `\n\nĐỊNH HƯỚNG:\n${meta.join('\n')}`
  if (ctx.knowledge) block += ctx.knowledge
  return block
}

const CHANNEL_INSTRUCTIONS: Record<ChannelKey, (ctx: StudioContext) => string> = {
  FACEBOOK: () => `Viết MỘT bài đăng Facebook cho fanpage Japan VIP:
- Câu hook 1–2 dòng gây chú ý.
- 3–4 lợi ích/tính năng nổi bật, mỗi dòng 1 emoji (✅ 🔥 💎 ⚡).
- Nêu giá / ưu đãi nếu có dữ liệu (không có thì bỏ qua, không bịa).
- CTA rõ ràng (nhắn tin / hotline 09.2729.8888 / ghé showroom).
- 5–8 hashtag cuối bài.
- Độ dài 150–250 từ.`,

  ZALO: () => `Viết MỘT tin Zalo OA cho Japan VIP:
- Rất ngắn gọn (60–120 từ), đi thẳng vào giá trị / ưu đãi / hàng mới về.
- 2–3 ý chính dạng gạch đầu dòng có emoji.
- 1 câu CTA cuối (nhắn Zalo 0988.969.896).
- Tối đa 2 hashtag.`,

  TIKTOK_CAPTION: () => `Viết caption TikTok cho video về sản phẩm này:
- 1–2 câu cực ngắn, có hook tò mò.
- 4–6 hashtag bắt trend (#hangNhat #giadungNhat #japanvip ...).
- Có thể 1 emoji.`,

  TIKTOK_SCRIPT: (ctx) => `Viết KỊCH BẢN quay TikTok ${ctx.length ? LENGTH_LABEL[ctx.length] : 'ngắn'} (khoảng 20–40 giây):
- Mở đầu bằng HOOK trong 3 giây đầu (câu khiến người xem dừng lướt).
- Chia theo từng cảnh: ghi mốc thời gian + lời thoại NGẮN + gợi ý hình ảnh quay (đặt trong ngoặc).
- Tập trung 1–2 điểm khác biệt thực tế, dễ quay tại showroom.
- Kết bằng CTA + nhắc theo dõi.`,

  YOUTUBE_SHORTS: (ctx) => `Viết kịch bản YouTube Shorts (30–50 giây) cho sản phẩm:
- Hook mạnh ở câu đầu.
- 3 ý nhanh, mỗi ý 1 câu, kèm gợi ý hình ảnh (trong ngoặc).
- CTA cuối.
${ctx.keywordPrimary ? `- Lồng tự nhiên từ khoá: ${ctx.keywordPrimary}.` : ''}`,

  YOUTUBE_OUTLINE: () => `Viết DÀN Ý video YouTube chuyên sâu (review / so sánh) cho sản phẩm:
- Tiêu đề video đề xuất (1–2 phương án).
- Phần mở đầu (vì sao đáng xem).
- Các phần thân: Thiết kế → Công nghệ/Tính năng → Trải nghiệm thực tế → Lưu ý điện áp tại VN → Phù hợp với ai → So sánh (nếu có dữ liệu).
- Phần kết + CTA.
- Trình bày dạng dàn ý gạch đầu dòng, mỗi mục 1 dòng gợi ý nội dung.`,

  EMAIL: (ctx) => `Viết MỘT email marketing cho Japan VIP, trình bày rõ các phần (mỗi phần xuống dòng, ghi nhãn):
Tiêu đề: (1 dòng, hấp dẫn, không clickbait quá đà)
Preview: (1 dòng preview text)
Nội dung: (3–5 đoạn ngắn, giá trị thật, ${ctx.audience ? `hướng tới ${ctx.audience}` : 'phù hợp khách quan tâm hàng Nhật'})
CTA: (1 nút/câu kêu gọi rõ ràng)`,

  PUSH: () => `Viết MỘT thông báo đẩy (push notification):
Tiêu đề: (tối đa ~50 ký tự, có sức hút)
Nội dung: (1 câu, dưới 120 ký tự, kèm 1 emoji nếu hợp)`,

  BANNER: () => `Đề xuất nội dung banner quảng cáo:
- 2–3 phương án HEADLINE (mỗi cái ≤ 8 từ, mạnh, rõ giá trị).
- 1 sub-headline ngắn cho mỗi phương án.
- 1 nút CTA gợi ý.`,

  META_AD: () => `Viết quảng cáo Meta (Facebook/Instagram Ads) dạng ngắn, ghi rõ 3 phần:
Primary text: (2–3 câu, hook + lợi ích + CTA)
Headline: (≤ 10 từ)
Description: (1 câu phụ trợ)`,

  CHATBOT: (ctx) => `Viết KỊCH BẢN tư vấn chatbot cho sản phẩm này:
- Lời chào mở đầu thân thiện.
- 3–4 cặp Câu hỏi khách thường gặp → Câu trả lời tư vấn (đúng dữ liệu, không bịa giá/bảo hành).
- 1 nhánh xử lý khi khách hỏi về điện áp / dùng tại Việt Nam${ctx.voltageNote ? '' : ' (nhắc cần xác minh công suất để chọn biến áp nếu là hàng 100V)'}.
- Câu chốt dẫn khách để lại số điện thoại / nhắn Zalo.`,
}

export function buildChannelPrompt(channelKey: ChannelKey, ctx: StudioContext): string {
  const instruction = CHANNEL_INSTRUCTIONS[channelKey](ctx)
  const lengthHint = ctx.length ? `\n(Độ dài tổng thể: ${LENGTH_LABEL[ctx.length]}.)` : ''
  return `${instruction}${lengthHint}${contextBlock(ctx)}`
}

// Tiêu đề mặc định cho một asset đã sinh (dùng khi lưu).
export function defaultAssetTitle(channelKey: ChannelKey, ctx: StudioContext): string {
  const subject = ctx.productName || ctx.topic || 'Nội dung'
  return `[${channelLabel(channelKey)}] ${subject}`.slice(0, 200)
}
