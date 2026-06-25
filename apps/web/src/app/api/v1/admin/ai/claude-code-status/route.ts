import { execSync } from 'child_process'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const raw = execSync('claude --version', { timeout: 5000 }).toString().trim()
    // "2.1.170 (Claude Code)"
    const version = raw.split('\n')[0]?.trim() ?? raw
    return Response.json({ available: true, version })
  } catch {
    return Response.json({ available: false, version: null })
  }
}
