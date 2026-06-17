import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response'
import { requestWithdrawal } from '@/modules/payment/wallet.service'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  amount: z.number().int('Số tiền phải là số nguyên').min(100_000, 'Tối thiểu 100,000₫'),
  bankName: z.string().min(2, 'Tên ngân hàng không hợp lệ').max(100),
  accountNumber: z.string().min(6, 'Số tài khoản không hợp lệ').max(30).regex(/^\d+$/, 'Số tài khoản chỉ gồm chữ số'),
  accountName: z.string().min(2, 'Tên tài khoản không hợp lệ').max(100),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Unauthorized', 401)

  const rl = await rateLimit(req, 'default', session.user.id)
  if (!rl.allowed) return apiError('Quá nhiều yêu cầu. Thử lại sau.', 429)

  try {
    const body = schema.parse(await req.json())
    const { txnNumber } = await requestWithdrawal(session.user.id, body.amount, {
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountName: body.accountName,
    })

    return apiSuccess(
      { txnNumber },
      'Yêu cầu rút tiền đã được gửi. Chúng tôi sẽ xử lý trong 1-2 ngày làm việc.'
    )
  } catch (err) {
    return handleApiError(err)
  }
}
