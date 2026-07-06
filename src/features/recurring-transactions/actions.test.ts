import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireSession, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockDb: {
    recurringTransaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

import { createRecurringTransaction } from './actions'

describe('createRecurringTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.category.findFirst.mockResolvedValue({ id: 'cat-1' })
  })

  it('sets nextRunDate to the provided start date', async () => {
    // Prisma resolves `amount` as a Decimal instance; mock a Decimal-like value
    // (numeric valueOf/toString) so the assertion below also proves the
    // action coerces it to a plain number before returning (see toPlainRule).
    const decimalLike = { valueOf: () => 3000, toString: () => '3000' }
    mockDb.recurringTransaction.create.mockResolvedValue({ id: 'rec-1', amount: decimalLike })

    const result = await createRecurringTransaction({
      categoryId: 'cat-1',
      type: 'INCOME',
      amount: 3000,
      currency: 'USD',
      frequency: 'MONTHLY',
      startDate: '2026-08-01',
    })

    // The Decimal-like amount must have been coerced to a primitive number.
    expect(result).toEqual({ id: 'rec-1', amount: 3000 })
    expect(typeof result.amount).toBe('number')
    expect(mockDb.recurringTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'INCOME',
        amount: 3000,
        currency: 'USD',
        frequency: 'MONTHLY',
        nextRunDate: new Date('2026-08-01'),
        note: undefined,
        active: true,
      },
    })
  })
})
