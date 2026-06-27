// Lấy tri thức ĐÃ DUYỆT từ DB (KnowledgeArticle APPROVED + KnowledgeFact VERIFIED)
// liên quan tới truy vấn (tên SP / danh mục / chủ đề) → khối text nạp vào prompt AI.
// Chạy bổ sung cho findRelevantKnowledge (nguồn JSON tĩnh).

import { prisma, Prisma } from '@japanvip/db'

function tokenize(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 3),
    ),
  ).slice(0, 8)
}

export async function getDbKnowledge(query: string, maxArticles = 2, maxFacts = 6): Promise<string> {
  const tokens = tokenize(query || '')
  if (!tokens.length) return ''

  const articleOr: Prisma.KnowledgeArticleWhereInput[] = tokens.flatMap((t) => [
    { title: { contains: t, mode: 'insensitive' } },
    { summary: { contains: t, mode: 'insensitive' } },
  ])
  articleOr.push({ tags: { hasSome: tokens } })

  const factOr: Prisma.KnowledgeFactWhereInput[] = tokens.flatMap((t) => [
    { subject: { contains: t, mode: 'insensitive' } },
    { object: { contains: t, mode: 'insensitive' } },
  ])

  const [articles, facts] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where: { status: 'APPROVED', OR: articleOr },
      orderBy: { updatedAt: 'desc' },
      take: maxArticles,
      select: { title: true, summary: true, content: true },
    }),
    prisma.knowledgeFact.findMany({
      where: { verificationStatus: 'VERIFIED', OR: factOr },
      orderBy: { updatedAt: 'desc' },
      take: maxFacts,
      select: { subject: true, predicate: true, object: true },
    }),
  ])

  if (!articles.length && !facts.length) return ''

  const parts: string[] = []
  if (facts.length) {
    parts.push(
      'DỮ KIỆN ĐÃ XÁC MINH:\n' +
        facts.map((f) => `- ${f.subject} ${f.predicate} ${f.object}`).join('\n'),
    )
  }
  if (articles.length) {
    parts.push(
      'BÀI TRI THỨC:\n' +
        articles
          .map((a) => `### ${a.title}\n${(a.summary || a.content).slice(0, 1000)}`)
          .join('\n\n'),
    )
  }

  return `\n\n---\n📚 KHO TRI THỨC JAPAN VIP (đã duyệt — ưu tiên dùng làm dữ kiện chính xác, không bịa thêm):\n\n${parts.join('\n\n')}\n---\n`
}
