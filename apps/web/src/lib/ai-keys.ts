import { prisma } from '@japanvip/db'
import { decrypt } from '@/lib/encrypt'

export type AiProvider = {
  id: string
  label: string
  prefix: string
  dbKey: string
}

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'anthropic',  label: 'Anthropic Claude',        prefix: 'sk-ant-', dbKey: 'ai.anthropic_api_key' },
  { id: 'openai',     label: 'OpenAI GPT',               prefix: 'sk-',     dbKey: 'ai.openai_api_key' },
  { id: 'gemini',     label: 'Google Gemini',            prefix: 'AIza',    dbKey: 'ai.gemini_api_key' },
  { id: 'stability',  label: 'Stability AI (Image)',     prefix: 'sk-',     dbKey: 'ai.stability_api_key' },
  { id: 'ideogram',   label: 'Ideogram (Image)',         prefix: '',        dbKey: 'ai.ideogram_api_key' },
  { id: 'replicate',  label: 'Replicate (Image/Video)',  prefix: 'r8_',     dbKey: 'ai.replicate_api_key' },
  { id: 'runway',     label: 'RunwayML (Video)',         prefix: '',        dbKey: 'ai.runway_api_key' },
  { id: 'kling',      label: 'Kling AI (Video)',         prefix: '',        dbKey: 'ai.kling_api_key' },
  { id: 'postbridge', label: 'PostBridge',               prefix: '',        dbKey: 'ai.postbridge_api_key' },
  { id: 'fal',        label: 'fal.ai',                   prefix: '',        dbKey: 'ai.fal_api_key' },
]

export async function getAiApiKey(providerId: string): Promise<string | null> {
  const provider = AI_PROVIDERS.find(p => p.id === providerId)
  if (!provider) return null
  const row = await prisma.siteSetting.findUnique({ where: { key: provider.dbKey } })
  if (!row) {
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

export async function getAnthropicApiKey(): Promise<string | null> {
  return getAiApiKey('anthropic')
}
