// Agent phân tích sản phẩm nội địa Nhật: dịch JP→VI, phát hiện thiếu/mâu thuẫn,
// gắn cờ rủi ro (điện 100V, cần biến áp…), khuyến nghị mua + hướng dẫn điện áp VN.
// Trả JSON. Gọi AI qua generateText (Claude Code free → fallback API). KHÔNG bịa thông số.

import { generateText } from '@/lib/content-studio/generate'

export type ProductAnalysis = {
  translatedSummary: string
  verifiedFacts: string[]
  missingFields: string[]
  riskFlags: string[]
  buyerGuidance: string
  voltageGuidance: string
  transformerGuidance: string
  modelComparisonNotes: string
  confidenceScore: number
}

export type ProductInput = {
  name: string
  brandName?: string
  categoryName?: string
  specs?: string
  description?: string
  originUrl?: string
  originalSourceText?: string
}

const SYSTEM = `Bạn là chuyên gia thẩm định hàng gia dụng NỘI ĐỊA NHẬT với 20 năm kinh nghiệm, đang hỗ trợ Japan VIP (nhập khẩu hàng Nhật về Việt Nam).
Nhiệm vụ: phân tích sản phẩm từ dữ liệu được cung cấp, dịch sang tiếng Việt tự nhiên, và đánh giá khách quan.

NGUYÊN TẮC:
- KHÔNG bịa thông số. Chỉ dùng dữ liệu được cung cấp. Thiếu gì thì đưa vào "missingFields", KHÔNG tự suy đoán.
- Hàng nội địa Nhật thường dùng điện 100V → nếu là thiết bị điện, nêu rõ rủi ro điện áp + thường cần biến áp ở Việt Nam. Nếu chưa rõ công suất → ghi cần xác minh công suất trước khi chọn biến áp.
- Gắn cờ rủi ro cho khâu nhập/bán: chỉ 100V, cần biến áp, chưa rõ năm SX, chưa rõ tình trạng máy, chưa có ảnh serial/model, chưa rõ phụ kiện kèm theo, kích thước lắp đặt, nguồn nước/khí nếu liên quan.
- Văn phong: rõ ràng, đáng tin, không khoa trương.

ĐẦU RA: CHỈ một object JSON hợp lệ, KHÔNG markdown, KHÔNG \`\`\`, KHÔNG giải thích. Bắt đầu bằng {.
Cấu trúc:
{
  "translatedSummary": "tóm tắt sản phẩm bằng tiếng Việt dễ hiểu (3-6 câu)",
  "verifiedFacts": ["dữ kiện chắc chắn từ dữ liệu, tiếng Việt"],
  "missingFields": ["thông tin còn thiếu cần bổ sung trước khi bán"],
  "riskFlags": ["cờ rủi ro cần kiểm tra (vd: Chỉ dùng điện 100V — cần biến áp)"],
  "buyerGuidance": "khuyến nghị cho khách Việt Nam: phù hợp với ai, lưu ý khi dùng",
  "voltageGuidance": "hướng dẫn điện áp khi dùng tại Việt Nam (nếu là thiết bị điện)",
  "transformerGuidance": "gợi ý biến áp nếu cần (công suất tham khảo); nếu chưa rõ công suất thì nói rõ cần xác minh",
  "modelComparisonNotes": "so sánh với model tương đương nếu suy ra được từ dữ liệu, nếu không có thì để chuỗi rỗng",
  "confidenceScore": 0
}
"confidenceScore" là số 0-100 phản ánh mức độ đầy đủ/chắc chắn của dữ liệu.`

function extractJson(text: string): string {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export async function analyzeProduct(
  input: ProductInput,
  model?: string,
): Promise<{ analysis: ProductAnalysis | null; source: string; error?: string }> {
  const lines = [`Tên: ${input.name}`]
  if (input.brandName) lines.push(`Thương hiệu: ${input.brandName}`)
  if (input.categoryName) lines.push(`Danh mục: ${input.categoryName}`)
  if (input.specs) lines.push(`Thông số: ${input.specs}`)
  if (input.description) lines.push(`Mô tả: ${input.description.slice(0, 2000)}`)
  if (input.originalSourceText) lines.push(`Nội dung gốc (tiếng Nhật): ${input.originalSourceText.slice(0, 2000)}`)
  if (input.originUrl) lines.push(`URL nguồn: ${input.originUrl}`)

  const prompt = `Phân tích sản phẩm sau và trả về JSON theo đúng cấu trúc đã quy định:\n\n${lines.join('\n')}`

  try {
    const { message, source, truncated } = await generateText(SYSTEM, prompt, model, { maxTokens: 4000, prefill: '{' })
    if (!message || message.startsWith('❌')) {
      return { analysis: null, source: 'none', error: 'Không sinh được phân tích (cần Claude Code local hoặc API key)' }
    }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(extractJson(message))
    } catch {
      return {
        analysis: null,
        source,
        error: truncated
          ? 'Phân tích bị cắt do nội dung quá dài — thử lại hoặc chọn sản phẩm ít dữ liệu hơn.'
          : 'AI trả về không đúng JSON — thử lại hoặc đổi model.',
      }
    }
    const analysis: ProductAnalysis = {
      translatedSummary: str(parsed.translatedSummary),
      verifiedFacts: arr(parsed.verifiedFacts),
      missingFields: arr(parsed.missingFields),
      riskFlags: arr(parsed.riskFlags),
      buyerGuidance: str(parsed.buyerGuidance),
      voltageGuidance: str(parsed.voltageGuidance),
      transformerGuidance: str(parsed.transformerGuidance),
      modelComparisonNotes: str(parsed.modelComparisonNotes),
      confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.round(parsed.confidenceScore) : 0,
    }
    return { analysis, source }
  } catch (err) {
    return { analysis: null, source: 'none', error: err instanceof Error ? err.message : 'Lỗi phân tích' }
  }
}
