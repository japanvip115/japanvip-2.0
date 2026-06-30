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
  'claude-sonnet-5': 'claude-sonnet-5',
  'claude-sonnet-4-6': 'claude-sonnet-4-6', // giữ lại để tương thích lựa chọn cũ
}

const clean = (s: string) => s.replace(/```/g, '').trim()

// Tuỳ chọn sinh nội dung. prefill: ép model bắt đầu bằng chuỗi cho trước (vd '{' để buộc ra JSON thuần).
export type GenOpts = { maxTokens?: number; prefill?: string }

export type GenResult = { message: string; source: string; truncated?: boolean }

function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

async function generateWithApi(system: string, prompt: string, model: string, opts?: GenOpts): Promise<GenResult> {
  const apiKey = await getAnthropicApiKey()
  if (!apiKey) return { message: '', source: 'none' }
  const client = new Anthropic({ apiKey })
  const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: prompt }]
  if (opts?.prefill) messages.push({ role: 'assistant', content: opts.prefill })
  const msg = await client.messages.create({
    model,
    max_tokens: opts?.maxTokens ?? 4000,
    system,
    messages,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (msg.content.find((c: any) => c.type === 'text') as any)?.text ?? ''
  // Anthropic không trả lại phần prefill trong response → ghép lại để có nội dung hoàn chỉnh.
  const full = text ? (opts?.prefill ?? '') + text : ''
  return { message: clean(full), source: model, truncated: msg.stop_reason === 'max_tokens' }
}

export async function generateText(system: string, prompt: string, model?: string, opts?: GenOpts): Promise<GenResult> {
  if (model && API_MODELS[model]) {
    return generateWithApi(system, prompt, API_MODELS[model]!, opts)
  }
  // Auto: local thử Claude Code trước (free). Local không hỗ trợ prefill nhưng extractJson phía gọi vẫn xử lý được.
  if (!process.env.VERCEL) {
    try {
      const local = clean(await collectStream(streamWithClaudeCode(prompt, system)))
      if (local && !local.startsWith('❌') && !/Lỗi khởi động Claude Code/.test(local)) {
        return { message: local, source: 'claude-code' }
      }
    } catch { /* rơi xuống dùng API */ }
  }
  return generateWithApi(system, prompt, 'claude-sonnet-5', opts)
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
