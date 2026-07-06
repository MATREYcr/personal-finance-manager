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
    mockDb.transaction.create.mockResolvedValue({ id: 'tx-1' })

    const result = await createTransaction({
      categoryId: 'cat-1',
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
      date: '2026-07-01',
    })

    expect(result).toEqual({ id: 'tx-1' })
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
