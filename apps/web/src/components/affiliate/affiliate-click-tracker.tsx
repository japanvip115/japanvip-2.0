'use client'

import { useEffect } from 'react'

// Khi khách đáp xuống trang có ?ref=CODE → ghi 1 lượt click (A2).
// Chạy 1 lần/ref mỗi tab (sessionStorage), dedup sâu hơn ở server (ipHash + 30 phút).
export function AffiliateClickTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (!ref || !/^[A-Z0-9_-]{3,20}$/i.test(ref)) return
    const al = params.get('al')
    const validAl = al && /^[A-Z0-9_-]{3,20}$/i.test(al) ? al : undefined

    const key = `aff_click_${ref.toUpperCase()}_${validAl ?? ''}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    fetch('/api/v1/tracking/affiliate-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        ref,
        al: validAl,
        landingUrl: window.location.pathname + window.location.search,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {})
  }, [])

  return null
}
