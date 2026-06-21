import { prisma } from '@japanvip/db'
import { LogoSettingsForm } from '@/components/admin/logo-settings-form'

export const metadata = { title: 'Logo & Thương Hiệu — Admin' }

export default async function LogoSettingsPage() {
  const keys = ['site_logo_url', 'site_name', 'site_tagline_jp', 'site_favicon_url']
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } })
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return (
    <div className="max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logo & Thương Hiệu</h1>
        <p className="mt-1 text-sm text-gray-500">Cập nhật logo, favicon, tên thương hiệu và tagline hiển thị trên website.</p>
      </div>
      <LogoSettingsForm
        logoUrl={map['site_logo_url'] ?? ''}
        faviconUrl={map['site_favicon_url'] ?? ''}
        siteName={map['site_name'] ?? 'Japan VIP'}
        taglineJp={map['site_tagline_jp'] ?? '日本ブランド'}
      />
    </div>
  )
}
