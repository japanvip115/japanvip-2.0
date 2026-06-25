import type { UserRole, UserStatus } from '@japanvip/db'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  status: UserStatus
}

export type AuthSession = {
  user: SessionUser
  expires: string
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CUSTOMER: 1,
  PARTNER: 2,
  EDITOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
