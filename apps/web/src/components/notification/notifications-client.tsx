'use client'

import { useState } from 'react'

type NotificationItem = {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
  link: string | null
}

const TYPE_ICONS: Record<string, string> = {
  BFJ_ORDER: '📦',
  AUCTION_BID: '🔨',
  AUCTION_WIN: '🏆',
  AUCTION_OUTBID: '⚡',
  WALLET: '💰',
  SYSTEM: 'ℹ️',
}

export function NotificationsClient({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: NotificationItem[]
  initialUnread: number
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unread, setUnread] = useState(initialUnread)
  const [markingAll, setMarkingAll] = useState(false)

  async function markAllRead() {
    setMarkingAll(true)
    try {
      const res = await fetch('/api/v1/users/me/notifications', { method: 'PATCH' })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnread(0)
      }
    } finally {
      setMarkingAll(false)
    }
  }

  async function markOneRead(id: string) {
    await fetch(`/api/v1/users/me/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnread((prev) => Math.max(0, prev - 1))
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed py-20 text-center text-gray-400">
        <p className="text-lg">Không có thông báo nào</p>
      </div>
    )
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs font-medium text-brand-red hover:underline disabled:opacity-50"
          >
            {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 rounded-xl border p-4 transition ${
              !n.isRead ? 'border-red-100 bg-red-50' : 'bg-white'
            }`}
            onClick={() => {
              if (!n.isRead) markOneRead(n.id)
              if (n.link) window.location.href = n.link
            }}
            role={n.link ? 'link' : undefined}
            style={{ cursor: n.link ? 'pointer' : 'default' }}
          >
            <span className="mt-0.5 text-xl">{TYPE_ICONS[n.type] ?? 'ℹ️'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                  {n.title}
                </p>
                {!n.isRead && (
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-red" />
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
