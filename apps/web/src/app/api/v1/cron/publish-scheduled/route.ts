import { NextRequest } from 'next/server'
import { prisma } from '@japanvip/db'
import { getContentStyle } from '@/lib/ai-style'
import { getAiApiKey } from '@/lib/ai-keys'
import { sendContentDoneEmail } from '@/lib/email.service'
import Anthropic from '@anthropic-ai/sdk'

// Vercel Cron gọi route này mỗi giờ
// vercel.json: { "crons": [{ "path": "/api/v1/cron/publish-scheduled", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  // Bảo vệ: chỉ Vercel Cron hoặc CRON_SECRET mới được gọi
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Lấy tất cả task PENDING đến hạn (scheduledAt <= now)
  const tasks = await prisma.contentTask.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: 5, // xử lý tối đa 5 task mỗi lần cron để tránh timeout
  })

  if (tasks.length === 0) {
    return Response.json({ processed: 0 })
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

  return Response.json({ processed: results.length, results })
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
  const apiKey = await getAiApiKey('anthropic')
  if (!apiKey) throw new Error('Chưa cấu hình Anthropic API Key')

  let userPrompt = ''

  if (task.type === 'BLOG_POST') {
    userPrompt = `Viết bài blog hoàn chỉnh dạng HTML về chủ đề: "${task.title}"
${task.topic ? `\nMô tả thêm: ${task.topic}` : ''}
${task.keywords ? `\nTừ khóa: ${task.keywords}` : ''}
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
${task.keywords ? `\nTừ khóa SEO: ${task.keywords}` : ''}

Yêu cầu:
- Viết bằng TIẾNG VIỆT hoàn toàn
- Đầy đủ 13 section theo SEO Framework 3.0
- Trả về HTML thuần túy`
  } else if (task.type === 'FAQ') {
    userPrompt = `Tạo 10–15 câu FAQ tiếng Việt cho: "${task.title}"
${task.topic ? `\nThông tin: ${task.topic}` : ''}
Xuất ra JSON array: [{"name": "Câu hỏi?", "value": "Trả lời..."}]`
  } else {
    userPrompt = `Tạo SEO meta tiếng Việt cho: "${task.title}"
Xuất ra JSON: {"title": "...", "description": "...", "keywords": [...], "slug": "..."}`
  }

  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return (msg.content[0] as any).text ?? ''
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
