import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

async function testAnthropic(apiKey: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  })
  if (res.ok) return { ok: true, info: 'claude-haiku-4-5' }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message ?? `HTTP ${res.status}` }
}

async function testOpenAI(apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) return { ok: true, info: 'gpt-4o available' }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message ?? `HTTP ${res.status}` }
}

async function testGemini(apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  )
  if (res.ok) return { ok: true, info: 'Gemini API OK' }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message ?? `HTTP ${res.status}` }
}

async function testOpenRouter(apiKey: string) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    const count = data?.data?.length ?? '?'
    return { ok: true, info: `${count} models available` }
  }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message ?? `HTTP ${res.status}` }
}

async function testGrok(apiKey: string) {
  const res = await fetch('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) return { ok: true, info: 'xAI Grok API OK' }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message ?? `HTTP ${res.status}` }
}

async function testStability(apiKey: string) {
  const res = await fetch('https://api.stability.ai/v1/user/account', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    const credits = data?.credits ?? '?'
    return { ok: true, info: `${credits} credits` }
  }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.message ?? `HTTP ${res.status}` }
}

async function testReplicate(apiKey: string) {
  const res = await fetch('https://api.replicate.com/v1/account', {
    headers: { Authorization: `Token ${apiKey}` },
  })
  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: true, info: data?.username ?? 'Account OK' }
  }
  return { ok: false, error: `HTTP ${res.status}` }
}

async function testFal(apiKey: string) {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'test', num_images: 1, image_size: 'square_hd', num_inference_steps: 1 }),
  })
  if (res.status === 200 || res.status === 201 || res.status === 422) return { ok: true, info: 'fal.ai key valid' }
  return { ok: false, error: `HTTP ${res.status}` }
}

const TESTERS: Record<string, (key: string) => Promise<{ ok: boolean; info?: string; error?: string }>> = {
  anthropic:  testAnthropic,
  openai:     testOpenAI,
  gemini:     testGemini,
  openrouter: testOpenRouter,
  grok:       testGrok,
  stability:  testStability,
  replicate:  testReplicate,
  fal:        testFal,
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId, apiKey } = await req.json()
  if (!providerId || !apiKey?.trim()) {
    return NextResponse.json({ ok: false, error: 'Thiếu providerId hoặc apiKey' }, { status: 400 })
  }

  const tester = TESTERS[providerId]
  if (!tester) {
    return NextResponse.json({ ok: true, info: 'Provider này chưa hỗ trợ test tự động — lưu và dùng thử trực tiếp.' })
  }

  try {
    const result = await Promise.race([
      tester(apiKey.trim()),
      new Promise<{ ok: false; error: string }>(resolve =>
        setTimeout(() => resolve({ ok: false, error: 'Timeout (10s)' }), 10000)
      ),
    ])
    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Lỗi không xác định'
    return NextResponse.json({ ok: false, error: msg })
  }
}
