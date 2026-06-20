import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'
import { encrypt, decrypt } from '@/lib/encrypt'
import { AI_PROVIDERS } from '@/lib/ai-keys'

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
