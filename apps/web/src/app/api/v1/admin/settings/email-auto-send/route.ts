import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { EMAIL_AUTOSEND_KEY } from '@/lib/email.service'

// Công tắc tổng email tự động/hàng loạt (chặn welcome/newsletter/win-back/digest... khi test/lỗi)
async function requireAdmin() {
  const session = await auth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session?.user || !hasRole((session.user as any).role, 'ADMIN')) return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return apiError('Unauthorized', 401)
  const s = await prisma.siteSetting.findUnique({ where: { key: EMAIL_AUTOSEND_KEY } })
  return apiSuccess({ enabled: s?.value !== 'false' }, undefined, 200)
}

const schema = z.object({ enabled: z.boolean() })

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return apiError('Unauthorized', 401)
  try {
    const { enabled } = schema.parse(await req.json())
    const value = enabled ? 'true' : 'false'
    await prisma.siteSetting.upsert({
      where: { key: EMAIL_AUTOSEND_KEY },
      update: { value },
      create: { key: EMAIL_AUTOSEND_KEY, value },
    })
    return apiSuccess({ enabled }, undefined, 200)
  } catch (err) {
    return handleApiError(err)
  }
}
