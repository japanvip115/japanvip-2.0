import { prisma, Prisma } from '@japanvip/db'
import type { NotificationChannel } from '@japanvip/db'

type NotifyInput = {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  channel?: NotificationChannel
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue | undefined,
      channel: input.channel ?? 'IN_APP',
      status: 'SENT',
      sentAt: new Date(),
    },
  })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, status: { not: 'READ' } },
  })
}

export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ])
  return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { status: 'READ', readAt: new Date() },
  })
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, status: { not: 'READ' } },
    data: { status: 'READ', readAt: new Date() },
  })
}
