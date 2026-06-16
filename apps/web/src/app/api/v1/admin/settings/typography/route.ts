import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { getActiveFont, setActiveFont } from '@/lib/font-settings'
import type { FontKey } from '@/lib/fonts'

const VALID_FONTS: FontKey[] = ['be-vietnam-pro', 'inter', 'noto-sans', 'roboto', 'open-sans']

const schema = z.object({
  font: z.enum(['be-vietnam-pro', 'inter', 'noto-sans', 'roboto', 'open-sans']),
})

export async function GET() {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const active = await getActiveFont()
    return apiSuccess({ active, supported: VALID_FONTS })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  try {
    const { font } = schema.parse(await req.json())
    await setActiveFont(font)
    return apiSuccess({ active: font }, 'Font đã được cập nhật')
  } catch (err) {
    return handleApiError(err)
  }
}
