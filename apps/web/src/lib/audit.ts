import { prisma, Prisma } from '@japanvip/db'
import { headers } from 'next/headers'

type AuditParams = {
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? null
  const userAgent = headersList.get('user-agent') ?? null

  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      oldValues: params.oldValues as Prisma.InputJsonValue | undefined,
      newValues: params.newValues as Prisma.InputJsonValue | undefined,
      ipAddress: ip,
      userAgent,
    },
  })
}
