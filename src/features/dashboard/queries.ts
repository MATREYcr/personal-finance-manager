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
