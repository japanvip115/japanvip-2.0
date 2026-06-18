import { getActiveExchangeRate } from './exchange-rate.service'
import { prisma } from '@japanvip/db'

export type ShippingTier = {
  id?: string
  label: string
  maxWeightKg: number | null
  estimatedDays: string
  priceVnd: number
  actualCostVnd: number
  sortOrder?: number
}

export type CostEstimate = {
  productPriceJpy: number
  productPriceVnd: number
  serviceFeeRate: number
  serviceFeeVnd: number
  domesticShippingJpy: number
  domesticShippingVnd: number
  surchargeRate: number
  surchargeVnd: number
  profitMarginRate: number
  profitMarginVnd: number
  shippingEstimateVnd: number
  shippingMarginVnd: number
  shippingTiers: ShippingTier[]
  depositRate: number
  depositAmountVnd: number
  totalEstimateVnd: number
  exchangeRate: number
  profitVnd: number
}

const DEFAULT_SETTINGS = {
  serviceFeeRate: 0.08,
  domesticShippingJpy: 0,
  surchargeRate: 0,
  depositRate: 0.30,
  profitMarginRate: 0,
}

const DEFAULT_TIERS: ShippingTier[] = [
  { label: 'Dưới 1 kg', maxWeightKg: 1, estimatedDays: '7–10 ngày', priceVnd: 450_000, actualCostVnd: 0 },
  { label: '1–3 kg', maxWeightKg: 3, estimatedDays: '7–10 ngày', priceVnd: 650_000, actualCostVnd: 0 },
  { label: '3–5 kg', maxWeightKg: 5, estimatedDays: '10–14 ngày', priceVnd: 950_000, actualCostVnd: 0 },
  { label: '5–10 kg', maxWeightKg: 10, estimatedDays: '10–14 ngày', priceVnd: 1_500_000, actualCostVnd: 0 },
  { label: 'Trên 10 kg', maxWeightKg: null, estimatedDays: '14–21 ngày', priceVnd: 2_500_000, actualCostVnd: 0 },
]

async function getSettings() {
  try {
    const [setting, tiers] = await Promise.all([
      prisma.bfjSetting.findUnique({ where: { id: 'default' } }),
      prisma.bfjShippingTier.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
    return {
      serviceFeeRate: setting ? Number(setting.serviceFeeRate) : DEFAULT_SETTINGS.serviceFeeRate,
      domesticShippingJpy: setting ? Number(setting.domesticShippingJpy) : DEFAULT_SETTINGS.domesticShippingJpy,
      surchargeRate: setting ? Number(setting.surchargeRate) : DEFAULT_SETTINGS.surchargeRate,
      depositRate: setting ? Number(setting.depositRate) : DEFAULT_SETTINGS.depositRate,
      profitMarginRate: setting ? Number(setting.profitMarginRate ?? 0) : DEFAULT_SETTINGS.profitMarginRate,
      tiers: tiers.length > 0
        ? tiers.map((t) => ({
            id: t.id,
            label: t.label,
            maxWeightKg: t.maxWeightKg !== null ? Number(t.maxWeightKg) : null,
            estimatedDays: t.estimatedDays,
            priceVnd: t.priceVnd,
            actualCostVnd: t.actualCostVnd,
            sortOrder: t.sortOrder,
          }))
        : DEFAULT_TIERS,
    }
  } catch {
    return { ...DEFAULT_SETTINGS, tiers: DEFAULT_TIERS }
  }
}

export async function calculateCostEstimate(params: {
  unitPriceJpy: number
  quantity: number
  estimatedWeightKg?: number
}): Promise<CostEstimate> {
  const { unitPriceJpy, quantity, estimatedWeightKg } = params

  const [rateData, settings] = await Promise.all([
    getActiveExchangeRate('JPY', 'VND'),
    getSettings(),
  ])

  const exchangeRate = rateData.rate
  const { serviceFeeRate, domesticShippingJpy, surchargeRate, depositRate, profitMarginRate, tiers } = settings

  const productPriceJpy = unitPriceJpy * quantity
  const productPriceVnd = Math.round(productPriceJpy * exchangeRate)
  const serviceFeeVnd = Math.round(productPriceVnd * serviceFeeRate)
  const domesticShippingVnd = Math.round(domesticShippingJpy * exchangeRate)
  const surchargeVnd = Math.round(productPriceVnd * surchargeRate)
  const profitMarginVnd = Math.round(productPriceVnd * profitMarginRate)

  const tier =
    estimatedWeightKg !== undefined
      ? pickTier(tiers, estimatedWeightKg)
      : (tiers[1] ?? tiers[0]!)
  const shippingEstimateVnd = tier.priceVnd
  const shippingMarginVnd = tier.priceVnd - tier.actualCostVnd

  const totalEstimateVnd = productPriceVnd + serviceFeeVnd + domesticShippingVnd + surchargeVnd + profitMarginVnd + shippingEstimateVnd
  const depositAmountVnd = Math.round(totalEstimateVnd * depositRate)
  const profitVnd = serviceFeeVnd + surchargeVnd + profitMarginVnd + shippingMarginVnd

  return {
    productPriceJpy,
    productPriceVnd,
    serviceFeeRate,
    serviceFeeVnd,
    domesticShippingJpy,
    domesticShippingVnd,
    surchargeRate,
    surchargeVnd,
    profitMarginRate,
    profitMarginVnd,
    shippingEstimateVnd,
    shippingMarginVnd,
    shippingTiers: tiers,
    depositRate,
    depositAmountVnd,
    totalEstimateVnd,
    exchangeRate,
    profitVnd,
  }
}

function pickTier(tiers: ShippingTier[], weightKg: number): ShippingTier {
  for (const tier of tiers) {
    if (tier.maxWeightKg === null || weightKg <= tier.maxWeightKg) return tier
  }
  return tiers[tiers.length - 1]!
}
