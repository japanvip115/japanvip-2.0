import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@japanvip/db'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            status: true,
            emailVerified: true,
            sessionVersion: true,
            profile: { select: { fullName: true, avatarUrl: true } },
          },
        })

        if (!user || !user.passwordHash) return null

        if (user.status === 'SUSPENDED') {
          prisma.loginHistory.create({
            data: { userId: user.id, success: false },
          }).catch(() => {})
          return null
        }

        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED:' + parsed.data.email)

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) {
          prisma.loginHistory.create({
            data: { userId: user.id, success: false },
          }).catch(() => {})
          prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: { increment: 1 } },
          }).catch(() => {})
          return null
        }

        // Đăng nhập thành công — reset failedLoginCount, ghi lịch sử
        prisma.loginHistory.create({
          data: { userId: user.id, success: true },
        }).catch(() => {})
        prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0 },
        }).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? null,
          image: user.profile?.avatarUrl ?? null,
          role: user.role,
          status: user.status,
          sessionVersion: user.sessionVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.status = (user as any).status
        token.sessionVersion = (user as any).sessionVersion ?? 0
      }

      // Kiểm tra session version mỗi khi token được refresh
      // Nếu user bị suspend → cập nhật token để middleware có thể block
      if (!user && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, sessionVersion: true },
          })
          if (dbUser) {
            // sessionVersion tăng khi bị auto-suspend → force re-login
            if (dbUser.sessionVersion !== token.sessionVersion) {
              token.status = dbUser.status
              token.sessionVersion = dbUser.sessionVersion
              // Trả token invalid sẽ force logout ở middleware
              if (dbUser.status === 'SUSPENDED') {
                return { ...token, error: 'SESSION_INVALIDATED' }
              }
            }
          }
        } catch {
          // DB không available — giữ token cũ
        }
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).status = token.status
        ;(session.user as any).sessionError = (token as any).error
      }
      return session
    },
  },
})
