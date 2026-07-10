import { describe, it, expect } from 'vitest'
import { computeSummary } from './compute-summary'

describe('computeSummary', () => {
  it('sums income and expense converted to the base currency', () => {
    const transactions = [
      { type: 'INCOME' as const, amount: 1000, currency: 'USD' },
      { type: 'EXPENSE' as const, amount: 90, currency: 'EUR' }, // -> 100 USD at rate 0.9
    ]
    const rates = { EUR: 0.9 }

    const summary = computeSummary(transactions, rates, 'USD')

    expect(summary.income).toBeCloseTo(1000)
    expect(summary.expense).toBeCloseTo(100)
    expect(summary.savings).toBeCloseTo(900)
  })

  it('returns zeroes for an empty transaction list', () => {
    expect(computeSummary([], {}, 'USD')).toEqual({
      income: 0,
      expense: 0,
      savings: 0,
    })
  })
})
