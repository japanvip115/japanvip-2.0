import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Quên mật khẩu — Japan VIP',
}

export default function ForgotPasswordPage() {
  return (
    <div className="px-4 py-12">
      <div className="mb-8 text-center">
        <a href="/" className="inline-block text-2xl font-black text-brand-red">
          Japan<span className="text-gray-900">VIP</span>
        </a>
        <p className="mt-2 text-sm text-gray-500">Đặt lại mật khẩu</p>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="mb-5 text-lg font-bold text-gray-900">Quên mật khẩu?</h1>
        <ForgotPasswordForm />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Nhớ mật khẩu rồi?{' '}
        <a href="/login" className="font-medium text-brand-red hover:underline">
          Đăng nhập
        </a>
      </p>
    </div>
  )
}
