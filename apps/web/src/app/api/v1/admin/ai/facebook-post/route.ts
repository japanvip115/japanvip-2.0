import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response'
import { streamWithClaudeCode } from '@/lib/claude-code-stream'
import { getAnthropicApiKey } from '@/lib/ai-keys'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const BRAND = `Japan VIP — hàng gia dụng nội địa Nhật chính hãng mới 100%.
Hotline: 09.2729.8888 · Di động/Zalo: 0988.969.896 · Web: japanvip.vn
Showroom: 21 Lê Văn Lương, Thanh Xuân, Hà Nội.`

const ANGLE_PROMPT: Record<string, string> = {
  product: `Viết MỘT bài đăng Facebook giới thiệu sản phẩm dưới đây cho fanpage Japan VIP.
- Câu hook đầu gây chú ý (1–2 dòng).
- 3–4 tính năng nổi bật, mỗi dòng 1 emoji (✅ 🔥 💎 ⚡).
- Nêu giá / ưu đãi nếu có.
- CTA rõ ràng: nhắn tin, hotline 09.2729.8888, hoặc ghé showroom.
- 5–8 hashtag cuối bài (#hàngNhật #japanvip #nộiđịaNhật ...).
- Độ dài 150–250 từ. Giọng nhiệt tình, tin cậy.`,
  promo: `Viết MỘT bài đăng Facebook ĐẨY CHƯƠNG TRÌNH (khuyến mãi / đấu giá / voucher / giới thiệu bạn bè) cho fanpage Japan VIP.
- Hook mạnh tạo cảm giác khẩn trương (flash sale, số lượng có hạn, deadline).
- Nêu rõ ưu đãi/cơ chế chương trình.
- CTA mạnh + hashtag.
- Độ dài 120–200 từ.`,
  tips: `Viết MỘT bài đăng Facebook KIẾN THỨC/MẸO DÙNG (giá trị, tăng tương tác) cho fanpage Japan VIP.
- Chủ đề: mẹo dùng/bảo quản đồ gia dụng Nhật, so sánh, hoặc kinh nghiệm chọn mua.
- Văn phong gần gũi, hữu ích; lồng nhẹ uy tín Japan VIP (không quảng cáo lộ liễu).
- Kết bằng 1 câu hỏi khơi gợi bình luận + vài hashtag.
- Độ dài 120–200 từ.`,
}

function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

const clean = (s: string) => s.replace(/```/g, '').trim()

// Model cho phép chọn từ UI (whitelist chống injection)
const API_MODELS: Record<string, string> = {
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
}

async function generateWithApi(system: string, prompt: string, model: string): Promise<{ message: string; source: string }> {
  const apiKey = await getAnthropicApiKey()
  if (!apiKey) return { message: '', source: 'none' }
  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (msg.content.find((c: any) => c.type === 'text') as any)?.text ?? ''
  return { message: clean(text), source: model }
}

/**
 * Sinh nội dung theo lựa chọn model:
 *  - 'auto' (mặc định): local thử Claude Code (free) → fallback API Sonnet
 *  - 'claude-opus-4-8' / 'claude-sonnet-4-6': gọi thẳng Anthropic API model đó
 */
async function generateContent(system: string, prompt: string, model?: string): Promise<{ message: string; source: string }> {
  // Chọn model API cụ thể → dùng API luôn
  if (model && API_MODELS[model]) {
    return generateWithApi(system, prompt, API_MODELS[model]!)
  }

  // Auto: local thử Claude Code trước (free)
  if (!process.env.VERCEL) {
    try {
      const local = clean(await collectStream(streamWithClaudeCode(prompt, system)))
      if (local && !local.startsWith('❌') && !/Lỗi khởi động Claude Code/.test(local)) {
        return { message: local, source: 'claude-code' }
      }
    } catch { /* rơi xuống dùng API */ }
  }
  return generateWithApi(system, prompt, 'claude-sonnet-4-6')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) return apiError('Unauthorized', 401)

  try {
    const { angle, productId, topic, model } = await req.json()
    const a = (angle ?? 'product').toString()
    const anglePrompt = ANGLE_PROMPT[a] ?? ANGLE_PROMPT.product

    let productBlock = ''
    if (productId) {
      const p = await prisma.product.findUnique({
        where: { id: productId.toString() },
        select: { name: true, salePrice: true, brand: { select: { name: true } }, attributes: { take: 8, select: { name: true, value: true } } },
      })
      if (p) {
        const specs = p.attributes.map((x) => `${x.name.replace(/^\[[^\]]+\]/, '')}: ${x.value}`).join('; ')
        productBlock = `\n\nSẢN PHẨM:\nTên: ${p.name}${p.brand ? `\nHãng: ${p.brand.name}` : ''}${p.salePrice ? `\nGiá: ${Number(p.salePrice).toLocaleString('vi-VN')}₫` : ''}${specs ? `\nThông số: ${specs}` : ''}`
      }
    }
    if (topic && topic.toString().trim()) {
      productBlock += `\n\nGỢI Ý/CHỦ ĐỀ: ${topic.toString().trim()}`
    }

    const system = `Bạn là chuyên gia content marketing Facebook cho thương hiệu hàng Nhật cao cấp.
${BRAND}
QUY TẮC ĐẦU RA:
- Trả về DUY NHẤT phần nội dung bài đăng (text thuần, có emoji + xuống dòng + hashtag).
- KHÔNG markdown, KHÔNG dấu \`\`\`, KHÔNG tiêu đề "Bài đăng:", KHÔNG giải thích.
- Viết hoàn toàn bằng tiếng Việt. Không bịa giá/thông tin không có.`

    const prompt = `${anglePrompt}${productBlock}`

    const { message, source } = await generateContent(system, prompt, model ? String(model) : undefined)

    if (!message || message.startsWith('❌')) {
      return apiError('Không sinh được nội dung. Bật Claude API (Cài Đặt → AI API Keys) hoặc chạy Claude Code ở máy local.', 502)
    }

    return apiSuccess({ message, source })
  } catch (err) {
    return handleApiError(err)
  }
}
