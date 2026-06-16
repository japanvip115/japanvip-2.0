import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getUserNotifications, getUnreadCount } from '@/modules/notification/notification.service'
import { NotificationsClient } from '@/components/notification/notifications-client'

export const metadata: Metadata = { title: 'Thông Báo' }

export default async function NotificationsPage() {
  const session = await auth()
  const [{ notifications }, unreadCount] = await Promise.all([
    getUserNotifications(session!.user!.id, 1, 30),
    getUnreadCount(session!.user!.id),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Thông Báo</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-bold text-white">
            {unreadCount} chưa đọc
          </span>
        )}
      </div>
      <NotificationsClient
        initialNotifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
          isRead: n.status === 'READ',
          createdAt: n.createdAt.toISOString(),
          link: (n.data as { link?: string } | null)?.link ?? null,
        }))}
        initialUnread={unreadCount}
      />
    </div>
  )
}
