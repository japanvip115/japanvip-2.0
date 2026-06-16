import { prisma } from '@japanvip/db'
import { BfjSettingsForm } from '@/components/admin/bfj-settings-form'

export const metadata = { title: 'Cài Đặt Mua Hộ — Admin' }
export const dynamic = 'force-dynamic'

export default async function BfjSettingsPage() {
  const [setting, tiers, rateRecord, rateHistory] = await Promise.all([
    prisma.bfjSetting.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }),
    prisma.bfjShippingTier.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'VND', isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exchangeRate.findMany({
      where: { fromCurrency: 'JPY', toCurrency: 'VND' },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  const currentRate = rateRecord ? Number(rateRecord.rate) : 170

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cài Đặt Mua Hộ</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tỷ giá, phí dịch vụ và bảng cước vận chuyển JP → VN
          </p>
        </div>
      </div>

      <BfjSettingsForm
        setting={{
          serviceFeeRate: Number(setting.serviceFeeRate),
          domesticShippingJpy: Number(setting.domesticShippingJpy),
          surchargeRate: Number(setting.surchargeRate),
          depositRate: Number(setting.depositRate),
          translationProvider: setting.translationProvider,
          translationApiKeyMasked: setting.translationApiKey
            ? '•'.repeat(Math.max(0, setting.translationApiKey.length - 4)) + setting.translationApiKey.slice(-4)
            : '',
          smtpHost: setting.smtpHost ?? '',
          smtpPort: setting.smtpPort,
          smtpUser: setting.smtpUser ?? '',
          smtpPassMasked: setting.smtpPass
            ? '•'.repeat(Math.max(0, setting.smtpPass.length - 4)) + setting.smtpPass.slice(-4)
            : '',
          smtpFrom: setting.smtpFrom ?? '',
          smtpSecure: setting.smtpSecure,
        }}
        tiers={tiers.map((t) => ({
          id: t.id,
          label: t.label,
          maxWeightKg: t.maxWeightKg !== null ? Number(t.maxWeightKg) : null,
          priceVnd: t.priceVnd,
          actualCostVnd: t.actualCostVnd,
          estimatedDays: t.estimatedDays,
        }))}
        currentRate={currentRate}
        rateHistory={rateHistory.map((r) => ({
          id: r.id,
          rate: Number(r.rate),
          source: r.source,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
