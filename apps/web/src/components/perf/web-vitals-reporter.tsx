'use client'

import { useEffect } from 'react'

// Thu Core Web Vitals của khách thật → gửi về /api/v1/vitals qua sendBeacon.
// Nạp web-vitals SAU khi mount (động, ~1.5KB) → không chặn render, không đụng LCP/TBT.
export function WebVitalsReporter() {
  useEffect(() => {
    // Bỏ qua local/dev — .env.local trỏ Redis prod nên localhost sẽ làm bẩn dữ liệu thật.
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return

    let stopped = false
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    const connection = conn?.effectiveType ?? ''

    const send = (metric: string, value: number) => {
      if (stopped) return
      const payload = JSON.stringify({
        metric,
        value,
        path: window.location.pathname,
        connection,
      })
      try {
        const blob = new Blob([payload], { type: 'application/json' })
        if (navigator.sendBeacon && navigator.sendBeacon('/api/v1/vitals', blob)) return
      } catch { /* fall through */ }
      // Fallback khi không có sendBeacon
      fetch('/api/v1/vitals', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
    }

    import('web-vitals')
      .then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
        if (stopped) return
        onLCP((m) => send('LCP', m.value))
        onINP((m) => send('INP', m.value))
        onCLS((m) => send('CLS', m.value))
        onFCP((m) => send('FCP', m.value))
        onTTFB((m) => send('TTFB', m.value))
      })
      .catch(() => {})

    return () => { stopped = true }
  }, [])

  return null
}
