import { prisma } from '@japanvip/db'

type Provider = 'anthropic' | 'google' | 'none'

async function getTranslationConfig(): Promise<{ provider: Provider; apiKey: string | null }> {
  try {
    const setting = await prisma.bfjSetting.findUnique({ where: { id: 'default' } })
    return {
      provider: (setting?.translationProvider ?? 'none') as Provider,
      apiKey: setting?.translationApiKey ?? null,
    }
  } catch {
    return { provider: 'none', apiKey: null }
  }
}

async function translateViaAnthropic(text: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Dịch tên sản phẩm này sang tiếng Việt, ngắn gọn (loại sản phẩm + thương hiệu + mã model + 1-2 thông số chính). Chỉ trả lời tên đã dịch, không giải thích:\n\n${text}`,
      }],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.[0]?.text?.trim() || text
}

async function translateViaGoogle(text: string, apiKey: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'vi', format: 'text' }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Google Translate ${res.status}`)
  const data = await res.json()
  const raw: string = data?.data?.translations?.[0]?.translatedText ?? ''
  // Decode HTML entities Google sometimes returns (e.g. &#39; → ')
  return raw.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim() || text
}

export async function translateProductName(englishName: string): Promise<string> {
  if (!englishName) return englishName

  try {
    const { provider, apiKey } = await getTranslationConfig()
    if (provider === 'none' || !apiKey) return englishName

    if (provider === 'anthropic') return await translateViaAnthropic(englishName, apiKey)
    if (provider === 'google') return await translateViaGoogle(englishName, apiKey)
  } catch {
    // silently fallback
  }

  return englishName
}
