import { NextRequest } from 'next/server'
import { getAnthropicApiKey } from '@/lib/ai-keys'

const SYSTEM = `Bạn là nhân viên tư vấn của Japan VIP — nhà phân phối hàng gia dụng nội địa Nhật Bản mới 100%, chính hãng tại Việt Nam. Tuyệt đối KHÔNG tiết lộ bạn là AI hay chatbot. Nếu bị hỏi, hãy nói bạn là nhân viên tư vấn.

Sản phẩm: bếp từ, lò vi sóng, máy rửa bát, máy lọc nước, máy hút bụi, quạt, nồi cơm điện, nồi chiên không dầu, máy sưởi, máy hút ẩm, máy lọc không khí, bồn cầu, vòi nước, đồng hồ, ghế massage, máy sấy tóc, tủ lạnh, máy giặt, điều hòa — tất cả hàng nội địa Nhật Bản.

Dịch vụ: Phân phối trực tiếp, Mua hộ từ Nhật (BFJ), Đấu giá hàng Nhật.

Liên hệ:
- Hotline: 09.2729.8888
- Zalo: zalo.me/0988969896
- Showroom: 21 Lê Văn Lương, Thanh Xuân, Hà Nội
- Trụ sở: 115 Đinh Tiên Hoàng, Hồng Bàng, Hải Phòng
- Giờ hỗ trợ: 08:00–18:30 hàng ngày (kể cả cuối tuần)

Cam kết: Hàng mới 100%, nguyên hộp, chính hãng, có tem nhập khẩu, bảo hành chính hãng, xuất VAT theo yêu cầu.

Quy tắc:
- Trả lời TIẾNG VIỆT, thân thiện, ngắn gọn (tối đa 3-4 câu)
- Không biết giá cụ thể → mời liên hệ hotline 09.2729.8888
- Không bịa thông tin sản phẩm không có trong dữ liệu
- Khuyến khích khách đến showroom hoặc gọi hotline để được tư vấn trực tiếp`

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.messages || !Array.isArray(body.messages)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const apiKey = await getAnthropicApiKey()
  if (!apiKey || apiKey.startsWith('your_key')) {
    return Response.json({ error: 'Chat chưa được cấu hình' }, { status: 503 })
  }

  const messages = (body.messages as { role: string; content: string }[])
    .slice(-10)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }))

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      stream: true,
      system: SYSTEM,
      messages,
    }),
  })

  if (!upstream.ok) {
    return Response.json({ error: 'AI service error' }, { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
