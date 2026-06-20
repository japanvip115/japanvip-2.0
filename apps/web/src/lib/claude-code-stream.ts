import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Knowledge base loader ────────────────────────────────────────────────────

type KBArticle = {
  title: string
  content: string
  keywords: string[]
  products_mentioned: string[]
  categoryLabel: string
}

let _kbCache: KBArticle[] | null = null

function loadKnowledgeBase(): KBArticle[] {
  if (_kbCache) return _kbCache
  const base = join(process.cwd(), '..', '..', 'knowledge-base')
  const articles: KBArticle[] = []
  for (const file of ['congnghenhat.json', 'phongcachnhat.json', 'hiephongjapan.json']) {
    try {
      const data = JSON.parse(readFileSync(join(base, file), 'utf-8'))
      for (const a of (data.articles ?? [])) {
        articles.push({
          title: a.title ?? '',
          content: (a.content ?? '').slice(0, 1200), // cap per article
          keywords: a.keywords ?? [],
          products_mentioned: a.products_mentioned ?? [],
          categoryLabel: a.categoryLabel ?? '',
        })
      }
    } catch { /* ignore — file may not exist */ }
  }
  _kbCache = articles
  return articles
}

export function findRelevantKnowledge(productName: string, maxArticles = 3): string {
  const articles = loadKnowledgeBase()
  if (!articles.length) return ''

  const name = productName.toLowerCase()

  // Score each article by relevance
  const scored = articles.map(a => {
    let score = 0
    // Keyword match in product name
    for (const kw of a.keywords) {
      if (name.includes(kw.toLowerCase())) score += 3
    }
    // Product name appears in article title
    const words = name.split(/\s+/).filter(w => w.length > 3)
    for (const w of words) {
      if (a.title.toLowerCase().includes(w)) score += 2
      if (a.content.toLowerCase().includes(w)) score += 1
    }
    // Category hint
    if (name.includes('tủ lạnh') && a.categoryLabel.toLowerCase().includes('tủ lạnh')) score += 5
    if (name.includes('máy giặt') && a.content.toLowerCase().includes('máy giặt')) score += 5
    if (name.includes('điều hòa') && a.content.toLowerCase().includes('điều hòa')) score += 5
    if (name.includes('máy lọc') && a.content.toLowerCase().includes('lọc')) score += 5
    if (name.includes('bếp từ') && a.content.toLowerCase().includes('bếp từ')) score += 5
    if (name.includes('máy sưởi') && a.content.toLowerCase().includes('sưởi')) score += 5
    return { a, score }
  })

  const top = scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxArticles)

  if (!top.length) return ''

  const parts = top.map(({ a }) =>
    `### ${a.title} (${a.categoryLabel})\n${a.content}`
  )

  return `\n\n---\n📚 TÀI LIỆU THAM KHẢO TỪ CÁC CHUYÊN GIA (dùng làm kiến thức nền, không copy nguyên văn):\n\n${parts.join('\n\n')}\n---\n`
}

// ── Claude Code subprocess streamer ─────────────────────────────────────────

export function streamWithClaudeCode(
  prompt: string,
  systemPrompt: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // Strip Anthropic API key from env so Claude Code uses Google OAuth session
      const { ANTHROPIC_API_KEY: _removed, ANTHROPIC_AUTH_TOKEN: _removed2, ...cleanEnv } = process.env
      const child = spawn('claude', [
        '--print',
        '--output-format', 'stream-json',
        '--verbose',
        '--system-prompt', systemPrompt,
        '--dangerously-skip-permissions',
      ], {
        env: cleanEnv,
      })

      // Send prompt via stdin
      child.stdin.write(prompt)
      child.stdin.end()

      let buffer = ''

      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const msg = JSON.parse(trimmed)
            // Extract text from assistant messages
            if (msg.type === 'assistant') {
              for (const block of (msg.message?.content ?? [])) {
                if (block.type === 'text' && block.text) {
                  controller.enqueue(encoder.encode(block.text))
                }
              }
            }
          } catch { /* ignore malformed lines */ }
        }
      })

      child.stderr.on('data', (_chunk: Buffer) => {
        // Ignore stderr (Claude Code logs debug info there)
      })

      child.on('close', (code) => {
        if (code !== 0 && code !== null) {
          controller.enqueue(encoder.encode(`\n\n❌ Claude Code exited with code ${code}`))
        }
        controller.close()
      })

      child.on('error', (err) => {
        controller.enqueue(encoder.encode(`\n\n❌ Lỗi khởi động Claude Code: ${err.message}`))
        controller.close()
      })
    },
  })
}
