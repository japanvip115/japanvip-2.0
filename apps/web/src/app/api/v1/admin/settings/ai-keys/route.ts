import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { encrypt, decrypt } from '@/lib/encrypt'

export type AiProvider = {
  id: string
  label: string
  prefix: string       // key phải bắt đầu bằng prefix này
  dbKey: string        // key trong SiteSetting
}

export const AI_PROVIDERS: AiProvider[] = [
  // ── Text / Chat ────────────────────────────────
  { id: 'anthropic',  label: 'Anthropic Claude',   prefix: 'sk-ant-',   dbKey: 'ai.anthropic_api_key' },
  { id: 'openai',     label: 'OpenAI GPT',          prefix: 'sk-',       dbKey: 'ai.openai_api_key' },
  { id: 'gemini',     label: 'Google Gemini',       prefix: 'AIza',      dbKey: 'ai.gemini_api_key' },
  // ── Image ─────────────────────────────────────
  { id: 'stability',  label: 'Stability AI (Image)',prefix: 'sk-',       dbKey: 'ai.stability_api_key' },
  { id: 'ideogram',   label: 'Ideogram (Image)',    prefix: '',          dbKey: 'ai.ideogram_api_key' },
  { id: 'replicate',  label: 'Replicate (Image/Video)', prefix: 'r8_',  dbKey: 'ai.replicate_api_key' },
  // ── Video ─────────────────────────────────────
  { id: 'runway',      label: 'RunwayML (Video)',       prefix: '',          dbKey: 'ai.runway_api_key' },
  { id: 'kling',       label: 'Kling AI (Video)',       prefix: '',          dbKey: 'ai.kling_api_key' },
  // ── Social & Automation ───────────────────────
  { id: 'postbridge',  label: 'PostBridge',             prefix: '',          dbKey: 'ai.postbridge_api_key' },
  { id: 'fal',         label: 'fal.ai',                 prefix: '',          dbKey: 'ai.fal_api_key' },
]

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allSettings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: 'ai.' } },
  })

  const result = AI_PROVIDERS.map(p => {
    const row = allSettings.find(s => s.key === p.dbKey)
    if (!row) return { id: p.id, hasKey: false, masked: null }
    try {
      const raw = decrypt(row.value)
      return { id: p.id, hasKey: true, masked: `${raw.slice(0, 10)}${'•'.repeat(18)}` }
    } catch {
      return { id: p.id, hasKey: false, masked: null }
    }
  })

  // Custom providers: key = ai.custom.{id}, meta stored in ai.custom.{id}.meta
  const customRows = allSettings.filter(s => s.key.startsWith('ai.custom.') && !s.key.endsWith('.meta'))
  const custom = customRows.map(row => {
    const id = row.key.replace('ai.custom.', '')
    const metaRow = allSettings.find(s => s.key === `ai.custom.${id}.meta`)
    let label = id, docsUrl = ''
    try { const m = JSON.parse(metaRow?.value ?? '{}'); label = m.label ?? id; docsUrl = m.docsUrl ?? '' } catch { /* ignore */ }
    try {
      const raw = decrypt(row.value)
      return { id, label, docsUrl, hasKey: true, masked: `${raw.slice(0, 10)}${'•'.repeat(18)}` }
    } catch {
      return { id, label, docsUrl, hasKey: false, masked: null }
    }
  })

  return Response.json({ providers: result, custom })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { providerId, apiKey, custom } = await req.json()

  // Custom provider
  if (custom) {
    const { id, label, docsUrl, apiKey: customKey } = custom
    if (!id || !customKey?.trim()) return Response.json({ error: 'Thiếu thông tin' }, { status: 400 })
    const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40)
    const encrypted = encrypt(customKey.trim())
    await prisma.siteSetting.upsert({
      where: { key: `ai.custom.${safeId}` },
      update: { value: encrypted },
      create: { key: `ai.custom.${safeId}`, value: encrypted },
    })
    await prisma.siteSetting.upsert({
      where: { key: `ai.custom.${safeId}.meta` },
      update: { value: JSON.stringify({ label: label || id, docsUrl: docsUrl || '' }) },
      create: { key: `ai.custom.${safeId}.meta`, value: JSON.stringify({ label: label || id, docsUrl: docsUrl || '' }) },
    })
    return Response.json({ success: true, id: safeId })
  }

  const provider = AI_PROVIDERS.find(p => p.id === providerId)
  if (!provider) return Response.json({ error: 'Provider không hợp lệ' }, { status: 400 })

  if (provider.prefix && !apiKey?.startsWith(provider.prefix)) {
    return Response.json({
      error: `Key không hợp lệ. ${provider.label} key phải bắt đầu bằng "${provider.prefix}"`,
    }, { status: 400 })
  }

  if (!apiKey?.trim()) return Response.json({ error: 'Key trống' }, { status: 400 })

  const encrypted = encrypt(apiKey.trim())
  await prisma.siteSetting.upsert({
    where: { key: provider.dbKey },
    update: { value: encrypted },
    create: { key: provider.dbKey, value: encrypted },
  })

  return Response.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'ADMIN')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { providerId, customId } = await req.json()

  if (customId) {
    const safeId = customId.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40)
    await prisma.siteSetting.deleteMany({ where: { key: { in: [`ai.custom.${safeId}`, `ai.custom.${safeId}.meta`] } } })
    return Response.json({ success: true })
  }

  const provider = AI_PROVIDERS.find(p => p.id === providerId)
  if (!provider) return Response.json({ error: 'Provider không hợp lệ' }, { status: 400 })

  await prisma.siteSetting.deleteMany({ where: { key: provider.dbKey } })
  return Response.json({ success: true })
}

// ── Helper: lấy key đã decrypt theo provider ──────────────────────────────────
export async function getAiApiKey(providerId: string): Promise<string | null> {
  const provider = AI_PROVIDERS.find(p => p.id === providerId)
  if (!provider) return null
  const row = await prisma.siteSetting.findUnique({ where: { key: provider.dbKey } })
  if (!row) {
    // Fallback về env var
    const envMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai:    'OPENAI_API_KEY',
      gemini:    'GEMINI_API_KEY',
      stability: 'STABILITY_API_KEY',
      replicate: 'REPLICATE_API_KEY',
      runway:    'RUNWAY_API_KEY',
      kling:     'KLING_API_KEY',
      ideogram:  'IDEOGRAM_API_KEY',
    }
    return process.env[envMap[providerId] ?? ''] ?? null
  }
  try { return decrypt(row.value) } catch { return null }
}

// Backward compat cho generate-content route
export async function getAnthropicApiKey(): Promise<string | null> {
  return getAiApiKey('anthropic')
}
