import { convertAmount, type RateMap } from '@/lib/currency/convert'
import type { DashboardSummary } from './types'

export interface SummarizableTransaction {
  type: 'EXPENSE' | 'INCOME'
  amount: number
  currency: string
}

export function computeSummary(
  transactions: SummarizableTransaction[],
  rates: RateMap,
  baseCurrency: string
): DashboardSummary {
  let income = 0
  let expense = 0

  for (const tx of transactions) {
    const converted = convertAmount(Number(tx.amount), tx.currency, baseCurrency, rates)
    if (tx.type === 'INCOME') income += converted
    else expense += converted
  }

  return { income, expense, savings: income - expense }
}
