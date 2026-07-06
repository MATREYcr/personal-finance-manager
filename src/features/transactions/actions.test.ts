import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireSession, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockDb: {
    transaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

import { createTransaction } from './actions'

describe('createTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('rejects a category that does not belong to the current user', async () => {
    mockDb.category.findFirst.mockResolvedValue(null)

    await expect(
      createTransaction({
        categoryId: 'someone-elses-category',
        type: 'EXPENSE',
        amount: 10,
        currency: 'USD',
        date: '2026-07-01',
      })
    ).rejects.toThrow(/category/i)
    expect(mockDb.transaction.create).not.toHaveBeenCalled()
  })

  it('creates the transaction when the category belongs to the user', async () => {
    mockDb.category.findFirst.mockResolvedValue({ id: 'cat-1' })
    // Prisma resolves `amount` as a Decimal instance in real usage — an object
    // with a numeric valueOf/toString, NOT a plain number. Mock that shape so
    // this test actually exercises createTransaction's coercion of it back to a
    // plain number (a Decimal isn't serializable across the Server Action
    // boundary and would crash the client without the coercion).
    const decimalLike = { valueOf: () => 10, toString: () => '10' }
    mockDb.transaction.create.mockResolvedValue({ id: 'tx-1', amount: decimalLike })

    const result = await createTransaction({
      categoryId: 'cat-1',
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
      date: '2026-07-01',
    })

    // The Decimal-like object must have been coerced to the primitive number 10.
    expect(result).toEqual({ id: 'tx-1', amount: 10 })
    expect(typeof result.amount).toBe('number')
    expect(mockDb.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'EXPENSE',
        amount: 10,
        currency: 'USD',
        date: new Date('2026-07-01'),
        note: undefined,
      },
    })
  })
})
