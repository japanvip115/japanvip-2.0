import type { UserRole, UserStatus } from '@japanvip/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: UserRole
      status: UserStatus
    }
  }

  interface User {
    id: string
    role: UserRole
    status: UserStatus
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    status: UserStatus
  }
}
