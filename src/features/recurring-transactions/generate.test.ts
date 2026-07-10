import { describe, it, expect, vi } from 'vitest'
import { generateDueRecurringTransactions } from './generate'

function makeMockDb(dueRules: any[]) {
  return {
    recurringTransaction: {
      findMany: vi.fn().mockResolvedValue(dueRules),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any
}

describe('generateDueRecurringTransactions', () => {
  it('creates a transaction and advances nextRunDate for each due rule', async () => {
    const rule = {
      id: 'rec-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      type: 'INCOME',
      amount: 3000,
      currency: 'USD',
      note: null,
      frequency: 'MONTHLY',
      nextRunDate: new Date('2026-07-01'),
    }
    const db = makeMockDb([rule])

    const result = await generateDueRecurringTransactions(
      db,
      new Date('2026-07-04'),
    )

    expect(result).toEqual({ generated: 1 })
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'INCOME',
        amount: 3000,
        currency: 'USD',
        date: new Date('2026-07-01'),
        note: null,
        recurringId: 'rec-1',
      },
    })
    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: { nextRunDate: new Date('2026-08-01') },
    })
  })

  it('advances WEEKLY by 7 days and YEARLY by 1 year', async () => {
    const weekly = {
      id: 'rec-w',
      userId: 'u',
      categoryId: 'c',
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
      note: null,
      frequency: 'WEEKLY',
      nextRunDate: new Date('2026-07-01'),
    }
    const yearly = {
      id: 'rec-y',
      userId: 'u',
      categoryId: 'c',
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
      note: null,
      frequency: 'YEARLY',
      nextRunDate: new Date('2026-07-01'),
    }
    const db = makeMockDb([weekly, yearly])

    await generateDueRecurringTransactions(db, new Date('2026-07-04'))

    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-w' },
      data: { nextRunDate: new Date('2026-07-08') },
    })
    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-y' },
      data: { nextRunDate: new Date('2027-07-01') },
    })
  })

  it('only queries active rules whose nextRunDate has passed', async () => {
    const db = makeMockDb([])
    const now = new Date('2026-07-04')

    await generateDueRecurringTransactions(db, now)

    expect(db.recurringTransaction.findMany).toHaveBeenCalledWith({
      where: { active: true, nextRunDate: { lte: now } },
    })
  })
})
