import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@japanvip/db'
import { decryptIfNeeded } from './encrypt'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Cache Google credentials — chỉ đọc DB một lần, tránh query mỗi request
let _googleCreds: { clientId: string; clientSecret: string } | null = null

async function getGoogleCreds(): Promise<{ clientId: string; clientSecret: string }> {
  if (_googleCreds) return _googleCreds

  let clientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? ''
  let clientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? ''

  if (!clientId || !clientSecret) {
    try {
      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['google_client_id', 'google_client_secret'] } },
      })
      const idRow = rows.find((r) => r.key === 'google_client_id')
      const secretRow = rows.find((r) => r.key === 'google_client_secret')
      if (idRow?.value) clientId = idRow.value
      if (secretRow?.value) clientSecret = decryptIfNeeded(secretRow.value) ?? secretRow.value
    } catch {
      // DB không available — dùng env vars
    }
  }

  _googleCreds = { clientId, clientSecret }
  return _googleCreds
}

const sharedCallbacks: NextAuthConfig['callbacks'] = {
  async signIn({ user, account }) {
    if (account?.provider === 'google') {
      if (!user.email) return false
      try {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, status: true },
        })
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              emailVerified: true,
              role: 'CUSTOMER',
              status: 'ACTIVE',
              profile: {
                create: {
                  fullName: user.name ?? '',
                  avatarUrl: user.image ?? null,
                },
              },
            },
            select: { id: true, status: true },
          })
        }
        if (dbUser.status === 'SUSPENDED') return false
        user.id = dbUser.id
      } catch (err) {
        console.error('[Google signIn error]', err)
        return false
      }
    }
    return true
  },
  async jwt({ token, user, account }) {
    if (account?.provider === 'google' && user) {
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { id: true, role: true, status: true, sessionVersion: true },
      })
      if (dbUser) {
        token.id = dbUser.id
        token.role = dbUser.role
        token.status = dbUser.status
        token.sessionVersion = dbUser.sessionVersion
      }
      return token
    }
    if (user) {
      token.id = user.id
      token.role = (user as any).role
      token.status = (user as any).status
      token.sessionVersion = (user as any).sessionVersion ?? 0
    }

    if (!user && token.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { status: true, sessionVersion: true },
        })
        if (dbUser) {
          if (dbUser.sessionVersion !== token.sessionVersion) {
            token.status = dbUser.status
            token.sessionVersion = dbUser.sessionVersion
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
}

const credentialsProvider = Credentials({
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
      prisma.loginHistory.create({ data: { userId: user.id, success: false } }).catch(() => {})
      return null
    }

    if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED:' + parsed.data.email)

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!valid) {
      prisma.loginHistory.create({ data: { userId: user.id, success: false } }).catch(() => {})
      prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 } } }).catch(() => {})
      return null
    }

    prisma.loginHistory.create({ data: { userId: user.id, success: true } }).catch(() => {})
    prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0 } }).catch(() => {})

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
})

// NextAuth v5 callback pattern — config được resolve async mỗi request
// Google credentials đọc từ DB lần đầu rồi cache lại
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const { clientId, clientSecret } = await getGoogleCreds()

  return {
    session: { strategy: 'jwt' as const },
    trustHost: true,
    pages: { signIn: '/login', error: '/login' },
    providers: [
      ...(clientId && clientSecret
        ? [Google({ clientId, clientSecret, authorization: { params: { prompt: 'select_account' } } })]
        : []),
      credentialsProvider,
    ],
    callbacks: sharedCallbacks,
  }
})
