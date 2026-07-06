'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import type { RateMap } from '@/lib/currency/convert'
import { getPeriodRange } from './period'
import { computeSummary } from './compute-summary'
import type { Period, DashboardSummary } from './types'

export async function getDashboardSummary(
  userId: string,
  period: Period,
  baseCurrency: string,
  // `reference` is intentionally left out of the callers' argument list (always
  // called with 3 args), so its default is NOT part of the `'use cache'` key.
  // The cached entry is instead refreshed by its cache tags — on any transaction
  // mutation (`transactions`) and at least daily via the FX cron
  // (`exchange-rates`) — which bounds period-boundary staleness to a few hours
  // on an idle account. Putting a live Date in the key would defeat caching.
  reference: Date = new Date()
): Promise<DashboardSummary> {
  cacheTag('transactions')
  cacheTag('exchange-rates')

  const { start, end } = getPeriodRange(period, reference)

  const [transactions, rateRows] = await Promise.all([
    db.transaction.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    db.exchangeRate.findMany(),
  ])

  const rates: RateMap = Object.fromEntries(rateRows.map((r) => [r.targetCurrency, Number(r.rate)]))

  return computeSummary(
    transactions.map((tx) => ({ type: tx.type, amount: Number(tx.amount), currency: tx.currency })),
    rates,
    baseCurrency
  )
}
