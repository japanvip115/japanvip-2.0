import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@japanvip/db'
import { auth } from '@/lib/auth'
import { hasRole } from '@/lib/auth-types'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
})

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return apiError('Unauthorized', 401)
  if (!hasRole(session.user!.role, 'ADMIN')) return apiError('Forbidden', 403)

  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return apiError('Không tìm thấy người dùng', 404)
  if (target.role === 'SUPER_ADMIN' && session.user!.role !== 'SUPER_ADMIN') return apiError('Không thể đổi mật khẩu Super Admin', 403)

  try {
    const { password } = schema.parse(await req.json())
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id }, data: { passwordHash } })
    return apiSuccess({ message: 'Đổi mật khẩu thành công' })
  } catch (err) {
    return handleApiError(err)
  }
}
