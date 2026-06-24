import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getFacebookConfigStatus, saveFacebookConfig, setFacebookPageName } from '@/lib/social/facebook-config'
import { testFacebookConnection } from '@/lib/social/facebook.service'
import { getAutoReplyConfig, saveAutoReplyConfig } from '@/lib/social/facebook-autoreply'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  return hasRole(session?.user?.role, 'ADMIN')
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const [status, autoreply] = await Promise.all([getFacebookConfigStatus(), getAutoReplyConfig()])
  return Response.json({ ...status, autoreply })
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

  // Lưu cấu hình auto-reply
  if (body.action === 'save-autoreply') {
    await saveAutoReplyConfig({
      enabled: !!body.enabled,
      defaultReply: (body.defaultReply ?? '').toString(),
      rules: Array.isArray(body.rules) ? body.rules : [],
      verifyToken: body.verifyToken ? body.verifyToken.toString() : undefined,
    })
    return Response.json({ success: true, autoreply: await getAutoReplyConfig() })
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
