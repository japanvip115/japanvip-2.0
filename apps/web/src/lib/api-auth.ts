import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { prisma } from '@japanvip/db'

// Cho phép session EDITOR/ADMIN hoặc Bearer API key content
export async function resolveEditorAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const setting = await prisma.siteSetting.findUnique({ where: { key: 'api_key_content' } })
      if (setting?.value === token) return true
    }
  }
  const session = await auth()
  return !!session && hasRole((session.user as any)?.role, 'EDITOR')
}
