import type { PrismaClient } from '@prisma/client'
import { PIVOT_CURRENCY } from '@/lib/currency/convert'

const FX_API_URL = `https://open.er-api.com/v6/latest/${PIVOT_CURRENCY}`

interface FxApiResponse {
  result: string
  base_code: string
  rates: Record<string, number>
}

export async function refreshExchangeRates(
  db: PrismaClient,
  fetchImpl: typeof fetch = fetch
): Promise<{ updated: number; error?: string }> {
  let data: FxApiResponse
  try {
    // Wrap the network call + JSON parse: a rejected fetch (DNS failure,
    // timeout, connection reset) or malformed body must degrade to a graceful
    // { updated: 0, error } — the same contract as an HTTP-error response —
    // rather than propagating out and surfacing as an unhandled 500 from the
    // cron route. (A DB upsert failure below is intentionally NOT swallowed:
    // that's a real fault the cron should surface and retry on.)
    const response = await fetchImpl(FX_API_URL)
    if (!response.ok) {
      return { updated: 0, error: `FX API responded with status ${response.status}` }
    }
    data = (await response.json()) as FxApiResponse
  } catch (error) {
    return { updated: 0, error: error instanceof Error ? error.message : 'FX API request failed' }
  }

  if (data.result !== 'success') {
    return { updated: 0, error: `FX API returned result: ${data.result}` }
  }

  let updated = 0
  for (const [currency, rate] of Object.entries(data.rates)) {
    if (currency === PIVOT_CURRENCY) continue
    await db.exchangeRate.upsert({
      where: { targetCurrency: currency },
      create: { targetCurrency: currency, rate },
      update: { rate },
    })
    updated++
  }

  return { updated }
}
