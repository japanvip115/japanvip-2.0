import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Đăng ký — Japan VIP',
  description: 'Tạo tài khoản Japan VIP để mua sắm hàng gia dụng nội địa Nhật Bản chính hãng.',
}

export default function RegisterPage() {
  return (
    <div className="px-4 py-12">
      <div className="mb-8 text-center">
        <a href="/" className="inline-block text-2xl font-black text-brand-red">
          Japan<span className="text-gray-900">VIP</span>
        </a>
        <p className="mt-2 text-sm text-gray-500">Tạo tài khoản miễn phí</p>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <RegisterForm />
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
