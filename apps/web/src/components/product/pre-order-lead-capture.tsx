'use client'

import { useEffect, useRef } from 'react'

// Khi khách đã đăng nhập xem giá VN của hàng Pre Order → lưu Lead (1 lần/phiên load).
export function PreOrderLeadCapture() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    fetch('/api/v1/leads/pre-order', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
