import type { Metadata } from 'next'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Xác thực email — Japan VIP',
}

export default function VerifyEmailPage() {
  return (
    <div className="px-4 py-12">
      <div className="mb-8 text-center">
        <a href="/" className="inline-block text-2xl font-black text-brand-red">
          Japan<span className="text-gray-900">VIP</span>
        </a>
        <p className="mt-2 text-sm text-gray-500">Xác thực địa chỉ email của bạn</p>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <VerifyEmailForm />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <a href="/login" className="font-medium text-brand-red hover:underline">
          Đăng nhập
        </a>
      </p>
    </div>
  )
}
