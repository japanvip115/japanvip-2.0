import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getFacebookConfigStatus, saveFacebookConfig, setFacebookPageName } from '@/lib/social/facebook-config'
import { testFacebookConnection } from '@/lib/social/facebook.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  return hasRole(session?.user?.role, 'ADMIN')
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getFacebookConfigStatus())
}

export async function POST(req: Request) {
  const session = await auth()
  if (!isAdmin(session)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Hành động test kết nối (không lưu)
  if (body.action === 'test') {
    const t = await testFacebookConnection()
    if (t.ok && t.pageName) await setFacebookPageName(t.pageName)
    return Response.json(t)
  }

  await saveFacebookConfig({
    pageId: (body.pageId ?? '').toString(),
    accessToken: body.accessToken ? body.accessToken.toString() : undefined,
    enabled: !!body.enabled,
  })

  // Lưu xong test luôn để báo trạng thái + cache tên page
  const test = await testFacebookConnection()
  if (test.ok && test.pageName) await setFacebookPageName(test.pageName)
  return Response.json({ success: true, test })
}
