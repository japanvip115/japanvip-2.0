import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { uploadFile } from '@/lib/r2'
import { prisma } from '@japanvip/db'
import { v4 as uuidv4 } from 'uuid'
import type { LogoTemplate } from '@/lib/template-matching'

const SETTING_KEY = 'logo_templates'

async function getTemplates(): Promise<LogoTemplate[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
  if (!row) return []
  try { return JSON.parse(row.value) as LogoTemplate[] } catch { return [] }
}

async function saveTemplates(templates: LogoTemplate[]) {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(templates) },
    update: { value: JSON.stringify(templates) },
  })
}

export async function GET() {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)
  return apiSuccess(await getTemplates())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string | null)?.trim() || 'Logo'

    if (!file) return apiError('Missing file', 400)

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) return apiError('Unsupported file type', 400)

    const buf = Buffer.from(await file.arrayBuffer())

    // Get image dimensions via sharp
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpModule = require('sharp')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharp: (...args: any[]) => any = sharpModule.default ?? sharpModule
    const meta = await sharp(buf).metadata()

    const url = await uploadFile('logo-templates', buf, file.type, file.name)

    const template: LogoTemplate = {
      id: uuidv4(),
      name,
      url,
      width: meta.width ?? 100,
      height: meta.height ?? 100,
    }

    const templates = await getTemplates()
    templates.push(template)
    await saveTemplates(templates)

    return apiSuccess(template)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || !hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const { id } = await req.json() as { id: string }
    const templates = await getTemplates()
    await saveTemplates(templates.filter((t) => t.id !== id))
    return apiSuccess({ deleted: id })
  } catch (err) {
    return handleApiError(err)
  }
}
