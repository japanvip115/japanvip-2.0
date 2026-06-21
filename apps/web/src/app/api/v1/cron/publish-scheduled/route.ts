import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { getContentStyle } from '@/lib/ai-style'
import { getAiApiKey } from '@/lib/ai-keys'
import { sendContentDoneEmail } from '@/lib/email.service'
import Anthropic from '@anthropic-ai/sdk'
import { streamWithClaudeCode, findRelevantKnowledge } from '@/lib/claude-code-stream'
import { runDailyMarketing } from '@/lib/marketing-cron.service'

export const maxDuration = 60

// Vercel Cron gọi route này 1 lần/ngày lúc 8:00 (Hobby: 1 cron/ngày)
// vercel.json: { "crons": [{ "path": "/api/v1/cron/publish-scheduled", "schedule": "0 8 * * *" }] }
// Cron này gánh luôn email marketing (win-back hằng ngày + digest thứ 5).

export async function GET(req: NextRequest) {
  // Bảo vệ: chỉ Vercel Cron hoặc CRON_SECRET mới được gọi
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Email marketing (win-back hằng ngày + digest thứ 5) — không chặn việc publish content
  const marketing = await runDailyMarketing().catch((e) => { console.error('marketing error', e); return { winback: 0, digest: 0 } })

  // Lấy tất cả task PENDING đến hạn (scheduledAt <= now)
  const tasks = await prisma.contentTask.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: 5, // xử lý tối đa 5 task mỗi lần cron để tránh timeout
  })

  if (tasks.length === 0) {
    return Response.json({ processed: 0, marketing })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const task of tasks) {
    // Đánh dấu RUNNING ngay để tránh cron chạy trùng
    await prisma.contentTask.update({ where: { id: task.id }, data: { status: 'RUNNING', ranAt: now } })

    try {
      const content = await generateContent(task)

      // Lưu kết quả tuỳ loại task
      let resultId: string | null = null
      let resultType: string | null = null

      if (task.type === 'BLOG_POST') {
        const slug = slugify(task.title) + '-' + task.id.slice(0, 6)
        const post = await prisma.blogPost.create({
          data: {
            title: task.title,
            slug,
            content,
            status: 'DRAFT',
            authorId: task.createdBy,
          },
        })
        resultId = post.id
        resultType = 'blog_post'
      } else if (task.type === 'PRODUCT_DESCRIPTION' && task.productId) {
        await prisma.product.update({
          where: { id: task.productId },
          data: { description: content },
        })
        resultId = task.productId
        resultType = 'product'
      }

      await prisma.contentTask.update({
        where: { id: task.id },
        data: { status: 'DONE', resultId, resultType },
      })

      // Gửi email thông báo
      let viewUrl = 'https://store.japanvip.vn/admin/content/calendar'
      if (resultType === 'blog_post' && resultId) viewUrl = `https://store.japanvip.vn/admin/content/blog/${resultId}`
      if (resultType === 'product' && resultId) viewUrl = `https://store.japanvip.vn/admin/products/${resultId}`
      await sendContentDoneEmail({ title: task.title, type: task.type, viewUrl }).catch(() => null)

      results.push({ id: task.id, status: 'done' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await prisma.contentTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', errorMessage: msg },
      })
      results.push({ id: task.id, status: 'failed', error: msg })
    }
  }

  return Response.json({ processed: results.length, results, marketing })
}

async function generateContent(task: {
  type: string
  title: string
  topic: string | null
  keywords: string | null
  sourceUrl: string | null
  provider: string
}): Promise<string> {
  const systemPrompt = await getContentStyle()

  // Tự tìm sản phẩm thực trong shop khớp với chủ đề → viết dựa trên SP thật + auto keywords
  const related = await findRelatedProducts(task.title)
  const productContext = related.length
    ? `\nSản phẩm Japan VIP ĐANG BÁN liên quan tới chủ đề này — hãy viết DỰA TRÊN các sản phẩm thực dưới đây, nêu đúng tên + mã model, và chèn link nội bộ tới từng sản phẩm:
${related.map(p => `- ${p.name}${p.brand?.name ? ` (hãng ${p.brand.name})` : ''} → https://store.japanvip.vn/san-pham/${p.slug}`).join('\n')}`
    : ''

  // Từ khóa SEO: nếu admin để trống → tự lấy từ tiêu đề + tên/model các sản phẩm liên quan
  const keywords = (task.keywords ?? '').trim() ||
    [task.title, ...related.slice(0, 5).map(p => p.name)].join(', ')

  let userPrompt = ''

  if (task.type === 'BLOG_POST') {
    userPrompt = `Viết bài blog hoàn chỉnh dạng HTML về chủ đề: "${task.title}"
${task.topic ? `\nMô tả thêm: ${task.topic}` : ''}
${`\nTừ khóa: ${keywords}`}${productContext}
${task.sourceUrl ? `\nTham khảo: ${task.sourceUrl}` : ''}

Yêu cầu:
- Viết bằng TIẾNG VIỆT hoàn toàn
- Dài 1200–1800 từ
- Có intro hấp dẫn, các section h2, kết luận + CTA Japan VIP
- SEO-friendly, natural keyword
- Trả về HTML thuần túy, KHÔNG có markdown fence`
  } else if (task.type === 'PRODUCT_DESCRIPTION') {
    userPrompt = `Viết mô tả sản phẩm hoàn chỉnh dạng HTML cho: "${task.title}"
${task.topic ? `\nThông tin sản phẩm: ${task.topic}` : ''}
${`\nTừ khóa SEO: ${keywords}`}${productContext}

Yêu cầu:
- Viết bằng TIẾNG VIỆT hoàn toàn
- Đầy đủ 13 section theo SEO Framework 3.0
- Trả về HTML thuần túy`
  } else if (task.type === 'FAQ') {
    userPrompt = `Tạo 10–15 câu FAQ tiếng Việt cho: "${task.title}"
${task.topic ? `\nThông tin: ${task.topic}` : ''}${productContext}
Xuất ra JSON array: [{"name": "Câu hỏi?", "value": "Trả lời..."}]`
  } else {
    userPrompt = `Tạo SEO meta tiếng Việt cho: "${task.title}"
Từ khóa gợi ý: ${keywords}
Xuất ra JSON: {"title": "...", "description": "...", "keywords": [...], "slug": "..."}`
  }

  // ── Claude Code (miễn phí — dùng subscription) ──────────────────────────
  if (task.provider === 'claude-code') {
    const kb = findRelevantKnowledge(task.title)
    const fullPrompt = `${userPrompt}${kb}`
    const stream = streamWithClaudeCode(fullPrompt, systemPrompt)
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let result = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
    return result
  }

  // ── Anthropic / OpenAI API ───────────────────────────────────────────────
  const apiKey = await getAiApiKey(task.provider === 'openai' ? 'openai' : 'anthropic')
  if (!apiKey) throw new Error(`Chưa cấu hình API Key cho provider: ${task.provider}`)

  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return (msg.content[0] as any).text ?? ''
}


// Tìm sản phẩm ACTIVE khớp với chủ đề (vd "Nồi cơm điện" → mọi nồi cơm điện đang bán)
async function findRelatedProducts(title: string) {
  const q = title.trim()
  if (!q) return []
  // Khớp cả cụm chủ đề lẫn từng từ chính (bỏ từ ngắn) để bắt rộng hơn
  const words = q.split(/\s+/).filter(w => w.length >= 2)
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        ...(words.length > 1 ? [{ AND: words.map(w => ({ name: { contains: w, mode: 'insensitive' as const } })) }] : []),
      ],
    },
    select: { name: true, slug: true, brand: { select: { name: true } } },
    orderBy: { showOnHome: 'desc' },
    take: 8,
  })
  return products
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}
