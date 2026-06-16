import { NextRequest } from 'next/server'
import { z } from 'zod'
import { calculateCostEstimate } from '@/modules/bfj/services/cost-calculator.service'
import { apiSuccess, handleApiError } from '@/lib/api-response'

const schema = z.object({
  unitPriceJpy: z.number().positive(),
  quantity: z.number().int().min(1).max(100),
  estimatedWeightKg: z.number().positive().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const estimate = await calculateCostEstimate(body)
    return apiSuccess(estimate)
  } catch (err) {
    return handleApiError(err)
  }
}
