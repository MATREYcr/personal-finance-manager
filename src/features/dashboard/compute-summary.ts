import { convertAmount, type RateMap } from '@/lib/currency/convert'
import type { DashboardSummary } from './types'
import type { TransactionType } from '@prisma/client'

export interface SummarizableTransaction {
  type: TransactionType
  amount: number
  currency: string
}

export function computeSummary(
  transactions: SummarizableTransaction[],
  rates: RateMap,
  baseCurrency: string,
): DashboardSummary {
  let income = 0
  let expense = 0

  for (const tx of transactions) {
    const converted = convertAmount(
      Number(tx.amount),
      tx.currency,
      baseCurrency,
      rates,
    )
    if (tx.type === 'INCOME') income += converted
    else expense += converted
  }

  return { income, expense, savings: income - expense }
}
