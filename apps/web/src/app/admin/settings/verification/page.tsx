import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@japanvip/db'
import { VerificationSettingsForm } from '@/components/admin/verification-settings-form'

export const metadata: Metadata = { title: 'Admin — Xác Minh Website' }

export default async function VerificationSettingsPage() {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ['site_google_verification', 'site_bing_verification', 'site_facebook_verification', 'site_facebook_pixel_id'] } },
  })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']))

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      <div>
        <Link
          href="/admin/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Cài Đặt
        </Link>
        <h1 className="text-2xl font-bold text-white">Xác Minh Website</h1>
        <p className="mt-1 text-sm text-gray-400">
          Dán mã xác minh Google Search Console / Bing — hệ thống tự gắn meta tag vào mọi trang, không cần sửa code.
        </p>
      </div>

      <VerificationSettingsForm
        googleVerification={map['site_google_verification'] ?? ''}
        bingVerification={map['site_bing_verification'] ?? ''}
        facebookVerification={map['site_facebook_verification'] ?? ''}
        facebookPixelId={map['site_facebook_pixel_id'] ?? ''}
      />
    </div>
  )
}
