/** Gắn UTM vào link để đo lưu lượng từ Facebook trên GA4. */
export function withUtm(rawUrl: string, opts: { campaign?: string; content?: string } = {}): string {
  try {
    const u = new URL(rawUrl)
    u.searchParams.set('utm_source', 'facebook')
    u.searchParams.set('utm_medium', 'social')
    u.searchParams.set('utm_campaign', opts.campaign || 'fanpage')
    if (opts.content) u.searchParams.set('utm_content', opts.content)
    return u.toString()
  } catch {
    return rawUrl
  }
}
