// Content Studio — orchestrator gọi AI cho từng kênh.
// Chính sách: 'auto' = thử Claude Code (free, local) trước → fallback API Sonnet.
// Chọn model API cụ thể → gọi thẳng Anthropic. KHÔNG sửa generate-content (vùng khoá).

import Anthropic from '@anthropic-ai/sdk'
import { streamWithClaudeCode } from '@/lib/claude-code-stream'
import { getAnthropicApiKey } from '@/lib/ai-keys'
import {
  buildSystemPrompt,
  buildChannelPrompt,
  type ChannelKey,
  type StudioContext,
} from '@/lib/content-studio/channels'

const API_MODELS: Record<string, string> = {
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
}

const clean = (s: string) => s.replace(/```/g, '').trim()

function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

async function generateWithApi(system: string, prompt: string, model: string): Promise<{ message: string; source: string }> {
  const apiKey = await getAnthropicApiKey()
  if (!apiKey) return { message: '', source: 'none' }
  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (msg.content.find((c: any) => c.type === 'text') as any)?.text ?? ''
  return { message: clean(text), source: model }
}

export async function generateText(system: string, prompt: string, model?: string): Promise<{ message: string; source: string }> {
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

export type ChannelResult = {
  channel: ChannelKey
  body: string
  source: string
  error?: string
}

export async function generateForChannel(
  channel: ChannelKey,
  ctx: StudioContext,
  model?: string,
): Promise<ChannelResult> {
  try {
    const system = buildSystemPrompt(channel)
    const prompt = buildChannelPrompt(channel, ctx)
    const { message, source } = await generateText(system, prompt, model)
    if (!message || message.startsWith('❌')) {
      return { channel, body: '', source: 'none', error: 'Không sinh được nội dung' }
    }
    return { channel, body: message, source }
  } catch (err) {
    return { channel, body: '', source: 'none', error: err instanceof Error ? err.message : 'Lỗi tạo nội dung' }
  }
}

export async function generateForChannels(
  channels: ChannelKey[],
  ctx: StudioContext,
  model?: string,
): Promise<ChannelResult[]> {
  // Chạy song song — Claude Code mỗi kênh là 1 subprocess; số kênh thường nhỏ.
  return Promise.all(channels.map((c) => generateForChannel(c, ctx, model)))
}
