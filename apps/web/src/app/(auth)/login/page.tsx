import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Đăng nhập — Japan VIP',
  description: 'Đăng nhập vào tài khoản Japan VIP để mua hàng, đấu giá và theo dõi đơn hàng.',
}

type Props = { searchParams: Promise<{ callbackUrl?: string; error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams

  return (
    <div className="px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <a href="/" className="inline-block text-2xl font-black text-brand-red">
          Japan<span className="text-gray-900">VIP</span>
        </a>
        <p className="mt-2 text-sm text-gray-500">Đăng nhập vào tài khoản của bạn</p>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error === 'CredentialsSignin'
              ? 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
              : 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
          </div>
        )}
        <LoginForm callbackUrl={callbackUrl ?? '/dashboard'} />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Chưa có tài khoản?{' '}
        <a href="/register" className="font-medium text-brand-red hover:underline">
          Đăng ký ngay
        </a>
      </p>
    </div>
  )
}
