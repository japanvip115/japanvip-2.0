import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { getAiApiKey } from '@/lib/ai-keys'

export async function GET() {
  const session = await auth()
  if (!hasRole((session?.user as any)?.role, 'EDITOR')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = await getAiApiKey('anthropic')
  if (!apiKey) {
    return Response.json({ success: false, message: 'Chưa cấu hình API Key' })
  }

  try {
    // Anthropic credit grants endpoint
    const res = await fetch('https://api.anthropic.com/v1/organizations/credit-grants', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    })

    if (!res.ok) {
      // Fallback: try to get usage data to estimate
      return Response.json({ success: false, message: 'Không lấy được số dư — xem tại console.anthropic.com' })
    }

    const data = await res.json()
    // data typically: { data: [{ total_granted_cents, total_used_cents, total_remaining_cents, expires_at }] }
    const grants = data?.data ?? []
    let totalRemainingCents = 0
    for (const g of grants) {
      if (g.total_remaining_cents != null) {
        totalRemainingCents += g.total_remaining_cents
      }
    }
    const remainingUsd = totalRemainingCents / 100

    return Response.json({ success: true, remainingUsd })
  } catch {
    return Response.json({ success: false, message: 'Lỗi kết nối' })
  }
}
